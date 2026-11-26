/**
 * A Vue `Ref<T>` mélyen kibontja a benne tárolt típust (`UnwrapRef`), így a
 * `ref<HTMLElement | null>(null)` értékének típusa egy mélyen átmásolt DOM-típus
 * lesz. A TypeScript 5.9 DOM-deklarációival (pl. `document.all`) ez a másolat
 * már nem bizonyíthatóan azonos az eredetivel, ezért a DOM-műveletek
 * (`ResizeObserver.observe`, `getComputedStyle`, `appendChild` stb.) hibát
 * jeleznek: „Type '...' is not assignable to parameter of type 'Element'”.
 *
 * A `RefUnwrapBailTypes` a Vue hivatalos kikötőhelye: az itt felsorolt típusokra
 * az unwrap nem másolja át a szerkezetet, hanem érintetlenül hagyja a típust.
 * Ezért a DOM-csomópontokra (és a hozzájuk tartozó alap-típusokra) kikapcsoljuk
 * a mély unwrapot – a `Ref` viselkedése és a futásidejű kód nem változik.
 */
declare module '@vue/reactivity' {
  interface RefUnwrapBailTypes {
    Element: Element
    Node: Node
    Document: Document
    Window: Window
  }
}

export {}
