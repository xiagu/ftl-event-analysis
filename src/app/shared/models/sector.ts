import {FTLTags} from '../../ftl_tags';
import {isDefined} from '../operators';

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
export interface SectorEventDefinition {
  keyName: string;
  min: number;
  max: number;
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

  const events: SectorEventDefinition[] =
      eventEls
          .map((eventEl) => {
            const keyName = eventEl.getAttribute('name');
            const min = Number(eventEl.getAttribute('min'));
            const max = Number(eventEl.getAttribute('max'));
            // Skip events with empty names or min and max of both 0.
            return keyName && Math.max(min, max) > 0 ? {keyName, min, max} :
                                                       null;
          })
          .filter(isDefined());

  return {keyName, textName, events};
}
