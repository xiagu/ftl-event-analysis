import {FTLTags} from '../../ftl_tags';

/** Sector record type with consolidated information about an FTL sector. */
export interface Sector {
  /** Name this sector is referenced as in XML. */
  keyName: string;
  /** Human-readable name this sector is displayed as. */
  textName: string;

  /** Events possible for beacons. Will undergo drastic refactoring. */
  eventNames: string[];
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

  const eventNames =
      Array.from(sectorDescription.querySelectorAll(FTLTags.EVENT))
          .map((event) => event.getAttribute('name'))
          .filter((name): name is string => !!name);

  return {keyName, textName, eventNames};
}
