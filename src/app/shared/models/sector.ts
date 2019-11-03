import {gamma} from 'mathjs';

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
export interface SectorEventDefinition extends SectorEventSansProbability {
  probability: EventProbability;
}

interface SectorEventSansProbability {
  keyName: string;
  min: number;
  max: number;
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

  const parsedEvents: SectorEventSansProbability[] =
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

  const bucketEventCount =
      parsedEvents.reduce((sum, event) => sum + (event.min + event.max) / 2, 0);
  // If there are more events in the bucket than there are beacons to assign
  // them, then some events won't get chosen. If there are fewer events in the
  // bucket than beacons, the remainder get filled in with Neutral events.
  const scaleDownFactor =
      EXPECTED_BEACON_COUNT / Math.max(bucketEventCount, EXPECTED_BEACON_COUNT)

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
