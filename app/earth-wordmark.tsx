/** Accessible animated Earth glyph: the first O in ASTROWORLD. */
export function EarthLetter(){
 return <span className="earth-letter" aria-hidden="true">
  <span className="earth-letter__continents"/>
  <span className="earth-letter__lighting"/>
 </span>;
}
export function EarthWord({variant='upper'}:{variant?:'upper'|'title'}){
 const upper=variant==='upper';
 return <span className="earth-word" role="img" aria-label={upper?'ASTROWORLD':'Astroworld'}>{upper?'ASTR':'Astr'}<EarthLetter/>{upper?'WORLD':'world'}</span>;
}
