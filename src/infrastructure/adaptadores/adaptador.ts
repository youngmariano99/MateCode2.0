export interface Adaptador<De, Para> {
  adaptar(de: De): Para;
}
