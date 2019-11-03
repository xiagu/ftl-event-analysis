import {BigNumber, combinations, divide, gamma, multiply, number} from 'mathjs';

import {FTLTags} from '../../ftl_tags';
import {isDefined} from '../operators';

/**
 * Mean number of beacons the player jumps through while passing through a
 * sector. (11 + 13) / 2
 *
 * TODO: Increase this for nebula sectors.
 */
const SECTOR_RUN_LENGTH = 12;

/**
 * The mean number of beacons in a sector, excluding the start and exit
 * beacons. (18 + 22) / 2
 */
const EXPECTED_BEACON_COUNT = 20;

/** Sector record type with consolidated information about an FTL sector. */
export interface Sector {
  /** Name this sector is referenced as in XML. */
  keyName: string;
  /** Human-readable name this sector is displayed as. */
  textName: string;

  /** Events possible for beacons. Will undergo drastic refactoring. */
  events: SectorEventDefinition[];
}

/** Special event definition used by sectors. */
export interface SectorEventDefinition extends EventPmf {
  probability: EventProbability;
}

interface EventPmf {
  keyName: string;
  pmf: Map<number, number>;
}

interface EventProbability {
  /**
   * Expected value of how many beacons in the sector have this event. Remember,
   * beacons aren't independent, because they pull from the same pool without
   * replacement.
   */
  expectedBeacons: number;
  /**
   * Probability that you will encounter this event on a run of "average"
   * length through this sector.
   */
  wholeSector: number;
}

/**
 * Construct a Sector record from the sectorDescription element and a map of key
 * names to text names.
 */
export function Sector(
    sectorDescription: Element, nameMap: Map<string, string>): Sector|null {
  const keyName = sectorDescription.getAttribute('name');
  if (!keyName) {
    console.error('Sector element had missing name.', sectorDescription);
    return null;
  }

  const textName = nameMap.get(keyName);
  // No error here because we pick up some unused sectors from the XML.
  if (!textName) return null;

  // Now, let's compute probabilities!
  const eventEls =
      Array.from(sectorDescription.querySelectorAll(FTLTags.EVENT));

  /** Parsed events, with min and max converted to uniform PMFs. */
  const eventsWithPmfs: EventPmf[] =
      eventEls
          .map((eventEl) => {
            const keyName = eventEl.getAttribute('name');
            const min = Number(eventEl.getAttribute('min'));
            const max = Number(eventEl.getAttribute('max'));
            // Skip events with empty names or min and max of both 0.
            if (!keyName || Math.max(min, max) < 1) return null;
            return {keyName, min, max};
          })
          .filter(isDefined())
          .map((event) => {
            return {
              keyName: event.keyName,
              pmf: discreteUniformDistribution(event.min, event.max),
            };
          });

  /** Probability mass function for the count of all events in the sector. */
  const eventCountPmf =
      jointProbabilityMassFunction(eventsWithPmfs.map((e) => e.pmf));

  /**
   * Event list with original count pmf (number of events during beacon
   * assignment) replaced by expected count pmf (the expected number of beacons
   * with this event in a sector).
   */
  const eventsWithExpectedPmf = eventsWithPmfs.map((event) => {
    /** The joint count PMF for all other events. */
    const otherEventCountPmf = jointPmfWithout(event, eventsWithPmfs);
    const newPmf = new Map<number, number>();

    // For each possible event count before adding this event, add this event's
    // counts and compute the chance for it to be dropped from the pool.
    otherEventCountPmf.forEach((otherMass, otherEventCount) => {
      event.pmf.forEach((mass, n) => {
        const extraEventCount = otherEventCount + n - EXPECTED_BEACON_COUNT;
        if (extraEventCount < 1) {
          // No events will be dropped.
          mapAddDefault(newPmf, n, mass * otherMass);
        } else {
          // Some of these events might not make it.
          for (let removedCount = 0;
               removedCount <= extraEventCount && removedCount <= n;
               removedCount++) {
            const remainingEvents = n - removedCount;
            // the chance of removing removedEvents of these events...
            const chanceToRemove =
                otherEventCount < (EXPECTED_BEACON_COUNT - remainingEvents) ?
                0 :
                number(
                    divide(
                        multiply(
                            combinations(n, removedCount),
                            combinations(
                                otherEventCount,
                                EXPECTED_BEACON_COUNT - remainingEvents)),
                        combinations(
                            otherEventCount + n, EXPECTED_BEACON_COUNT)) as
                    BigNumber) as number;

            mapAddDefault(
                newPmf, remainingEvents, chanceToRemove * mass * otherMass);
          }
        }
      });
    });

    return {
      keyName: event.keyName,
      pmf: newPmf,
    };
  });

  /**
   * PMF for neutral filler events. Initialized with all the mass at 0 events.
   */
  const neutralEventPmf = new Map<number, number>([[0, 1]]);
  eventCountPmf.forEach((mass, n) => {
    if (n >= EXPECTED_BEACON_COUNT) return;
    // Move the mass from 0 to n.
    neutralEventPmf.set(EXPECTED_BEACON_COUNT - n, mass);
    neutralEventPmf.set(0, neutralEventPmf.get(0)! - mass);
    // Update the mass in the combined joint pmf as well.
    console.log(`Consolidating mass from ${n} event chance`);
    eventCountPmf.delete(n);
    mapAddDefault(eventCountPmf, EXPECTED_BEACON_COUNT, mass);
  });

  console.log(`\nJoint event count PMF for ${textName}`);
  const format = new Intl.NumberFormat('en-Us', {
    style: 'percent',
    maximumSignificantDigits: 4,
  });
  eventCountPmf.forEach((mass, i) => {
    console.log(`${i}: ${format.format(mass)}`);
  });
  console.log('Neutral event pmf');
  neutralEventPmf.forEach((mass, i) => {
    console.log(`${i}: ${format.format(mass)}`);
  });


  // Add any filler neutral events to the final event list.
  if (neutralEventPmf.get(0) !== 1) {
    // TODO: Make these constants somewhere and add NEUTRAL_CIVILIAN as well.
    const existingNeutral =
        eventsWithExpectedPmf.find(({keyName}) => keyName === 'NEUTRAL');
    if (existingNeutral) {
      existingNeutral.pmf =
          jointProbabilityMassFunction([existingNeutral.pmf, neutralEventPmf]);
    } else {
      eventsWithExpectedPmf.push({
        keyName: 'NEUTRAL',
        pmf: neutralEventPmf,
      });
    }
  }

  const events: SectorEventDefinition[] = eventsWithExpectedPmf.map((event) => {
    const expectedBeacons = expectedValue(event.pmf);
    // This isn't true either. We have to break it down according to the PMF.
    const beaconsWithoutEvent = EXPECTED_BEACON_COUNT - expectedBeacons;

    const pathsThruSector =
        combinations(EXPECTED_BEACON_COUNT, SECTOR_RUN_LENGTH) as number;

    const pathsWithoutEvent = beaconsWithoutEvent <= SECTOR_RUN_LENGTH ?
        1 :
        gamma(beaconsWithoutEvent + 1) /
            (gamma(beaconsWithoutEvent - SECTOR_RUN_LENGTH + 1) *
             gamma(SECTOR_RUN_LENGTH + 1));

    const wholeSector = 1 - pathsWithoutEvent / pathsThruSector;

    return {
      ...event,
      probability: {expectedBeacons, wholeSector} as EventProbability,
    };
  });

  return {keyName, textName, events};
}

/**
 * Compute the joint probability mass function of the given array of discrete
 * linear random variables. Returns a sparse array.
 */
function jointProbabilityMassFunction(pmfs: ReadonlyArray<Map<number, number>>):
    Map<number, number> {
  return pmfs.reduce<Map<number, number>>((jointPmf, pmf) => {
    const newPmf = new Map<number, number>();
    pmf.forEach((massA, valueA) => {
      jointPmf.forEach((massB, valueB) => {
        mapAddDefault(newPmf, valueA + valueB, massA * massB);
      });
    });
    return newPmf;
  }, new Map([[0, 1]]));
}

/**
 * Compute the joint probability mass function of all events except the given
 * one.
 */
function jointPmfWithout(
    event: EventPmf, events: readonly EventPmf[]): Map<number, number> {
  const eventsWithout = events.filter((e) => e.keyName !== event.keyName);
  return jointProbabilityMassFunction(eventsWithout.map((e) => e.pmf));
}

/** Return the discrete uniform distribution between the two given integers. */
function discreteUniformDistribution(
    min: number, max: number): Map<number, number> {
  const pmf = new Map<number, number>();
  // Mass for each outcome: 1/n
  const mass = 1 / (max - min + 1);

  for (let i = min; i <= max; i++) {
    pmf.set(i, mass);
  }

  return pmf;
}

/**
 * Compute the expected value of a probability mass function: the result of
 * summing the product of all counts and their probability mass.
 */
function expectedValue(pmf: Map<number, number>): number {
  return Array.from(pmf.entries())
      .reduce((sum, [count, mass]) => sum + count * mass, 0);
}

/**
 * Add value to the entry at the given key. If map doesn't have that key, adds
 * to given default value.
 */
function mapAddDefault(
    map: Map<number, number>, key: number, value: number, defaultValue = 0) {
  map.set(key, (map.get(key) || defaultValue) + value);
}
