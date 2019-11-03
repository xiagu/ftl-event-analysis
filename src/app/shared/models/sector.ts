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

/** Special event definition used by sectors, including min and max counts. */
export interface SectorEventDefinition extends ParsedEvent {
  probability: EventProbability;
}

interface ParsedEvent {
  keyName: string;
  min: number;
  max: number;
}

interface EventPmf {
  keyName: string;
  pmf: Map<number, number>;
}

interface EventProbability {
  /**
   * Probability that, if you pick one of the beacons in the sector at random,
   * it will have this event. Note this is NOT the same as the chance your next
   * beacon has this event -- beacons aren't independent (because they were
   * pulled from a set rolled at sector gen).
   */
  beacon: number;
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

  const parsedEvents: ParsedEvent[] =
      eventEls
          .map((eventEl) => {
            const keyName = eventEl.getAttribute('name');
            const min = Number(eventEl.getAttribute('min'));
            const max = Number(eventEl.getAttribute('max'));
            // Skip events with empty names or min and max of both 0.
            if (!keyName || Math.max(min, max) < 1) return null;
            return {keyName, min, max};
          })
          .filter(isDefined());

  // This is... not exactly wrong, but not the whole story.
  const bucketEventCount =
      parsedEvents.reduce((sum, event) => sum + (event.min + event.max) / 2, 0);

  // If there are more events in the bucket than there are beacons to assign
  // them, then some events won't get chosen. If there are fewer events in the
  // bucket than beacons, the remainder get filled in with Neutral events.
  const scaleDownFactor =
      EXPECTED_BEACON_COUNT / Math.max(bucketEventCount, EXPECTED_BEACON_COUNT)


  const eventsWithPmfs: EventPmf[] = parsedEvents.map((event) => {
    return {
      keyName: event.keyName,
      pmf: discreteUniformDistribution(event.min, event.max),
    };
  });

  const eventCountPmf =
      jointProbabilityMassFunction(eventsWithPmfs.map((e) => e.pmf));
  console.log(`\nJoint event count PMF for ${textName}`);
  const format = new Intl.NumberFormat('en-Us', {
    style: 'percent',
    maximumSignificantDigits: 4,
  });

  // Compute expected value for events.


  const sortedPossibleCounts =
      Array.from(eventCountPmf.keys()).sort((a, b) => a - b);
  const maxEventCount = sortedPossibleCounts[sortedPossibleCounts.length - 1];
  const minEventCount = sortedPossibleCounts[0];
  const finalThing = eventsWithPmfs.map((event) => {
    // Adjust PMFs for overcapped thing.

    // I think we do need the pmf of all other events, for each event. womp.
    const otherEventCountPmf = jointPmfWithout(event, eventsWithPmfs);
    const newPmf = new Map<number, number>();

    // So now for this thing, we look at each of its possibilities, and add our
    // own.
    otherEventCountPmf.forEach((otherMass, eventCount) => {
      event.pmf.forEach((mass, n) => {
        const extraEventCount = eventCount + n - EXPECTED_BEACON_COUNT;
        if (extraEventCount < 1) {
          // Then everything is fine.
          newPmf.set(n, (newPmf.get(n) || 0) + mass * otherMass);
        } else {
          // One or more of these events might not make it.
          for (let removedEvents = 0;
               removedEvents <= extraEventCount && removedEvents <= n;
               removedEvents++) {
            const remainingEvents = n - removedEvents;
            // the chance of removing removedEvents of these events...
            const chanceToRemove =
                eventCount < (EXPECTED_BEACON_COUNT - remainingEvents) ?
                0 :
                number(
                    divide(
                        multiply(
                            combinations(n, removedEvents),
                            combinations(
                                eventCount,
                                EXPECTED_BEACON_COUNT - remainingEvents)),
                        combinations(eventCount + n, EXPECTED_BEACON_COUNT)) as
                    BigNumber) as number;

            newPmf.set(
                remainingEvents,
                (newPmf.get(remainingEvents) || 0) +
                    chanceToRemove * mass * otherMass);
          }
        }
      });
    });

    return {
      keyName: event.keyName,
      pmf: newPmf,
    };
  });

  console.log('Real final  thing???');
  console.log(finalThing);
  console.log(finalThing.map(
      (({pmf}) => Array.from(pmf.values()).reduce((sum, x) => sum + x))));


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
    eventCountPmf.delete(n);
    eventCountPmf.set(
        EXPECTED_BEACON_COUNT,
        (eventCountPmf.get(EXPECTED_BEACON_COUNT) || 0) + mass);
  });

  eventCountPmf.forEach((mass, i) => {
    console.log(`${i}: ${format.format(mass)}`);
  });

  // If there are sometimes filler neutral events.
  if (neutralEventPmf.get(0) !== 1) {
    // TODO: Make these constants somewhere and add NEUTRAL_CIVILIAN as well.
    const existingNeutral =
        eventsWithPmfs.find(({keyName}) => keyName === 'NEUTRAL');
    if (existingNeutral) {
      existingNeutral.pmf =
          jointProbabilityMassFunction([existingNeutral.pmf, neutralEventPmf]);
    } else {
      eventsWithPmfs.push({
        keyName: 'NEUTRAL',
        pmf: neutralEventPmf,
      });
    }
  }

  console.log('Neutral event pmf');
  neutralEventPmf.forEach((mass, i) => {
    console.log(`${i}: ${format.format(mass)}`);
  });


  // Okay so we have a PMF. Now what?
  // Keep doing everything... discretely?

  // Add in the Neutral events for the chances of being below whatever.

  const events: SectorEventDefinition[] = parsedEvents.map((event) => {
    const beaconsWithEvent = (event.min + event.max) / 2 * scaleDownFactor;
    const beaconsWithoutEvent = EXPECTED_BEACON_COUNT - beaconsWithEvent;
    const beacon = beaconsWithEvent * scaleDownFactor / EXPECTED_BEACON_COUNT;

    // We have to do some combination stuff.
    const pathsThruSector = gamma(EXPECTED_BEACON_COUNT) /
        (gamma(EXPECTED_BEACON_COUNT - SECTOR_RUN_LENGTH) *
         gamma(SECTOR_RUN_LENGTH));

    const pathsWithoutEvent = beaconsWithoutEvent === SECTOR_RUN_LENGTH ?
        1 :
        gamma(beaconsWithoutEvent) /
            (gamma(beaconsWithoutEvent - SECTOR_RUN_LENGTH) *
             gamma(SECTOR_RUN_LENGTH));

    const wholeSector = 1 - pathsWithoutEvent / pathsThruSector;

    return {
      ...event,
      probability: {beacon, wholeSector} as EventProbability,
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
        const existingValue = newPmf.get(valueA + valueB) || 0;
        newPmf.set(valueA + valueB, existingValue + massA * massB);
      });
    });
    return newPmf;
  }, new Map([[0, 1]]));
}

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
