<script setup lang="ts">
interface ComparisonRow {
  label: string
  staticQr: string
  dynamicQr: string
}

const rows: ComparisonRow[] = [
  {
    label: 'Hol van a tartalom?',
    staticQr: 'Magában a kód mintázatában',
    dynamicQr: 'A szerveren, a rövid qrkod24.hu link mögött',
  },
  {
    label: 'Módosítható a cél?',
    staticQr: 'Nem – új kódot kell készíteni',
    dynamicQr: 'Igen, a kód változatlan marad',
  },
  {
    label: 'Újranyomtatás',
    staticQr: 'Minden változásnál szükséges',
    dynamicQr: 'Nem kell, a kinyomtatott kód tovább működik',
  },
  {
    label: 'Beolvasások mérése',
    staticQr: 'Nem mérhető',
    dynamicQr: 'Mérhető: összesített, adatvédelem-barát statisztika',
  },
  {
    label: 'Internet a beolvasáshoz',
    staticQr: 'Nem kell (a kód önmagában is olvasható)',
    dynamicQr: 'Kell az átirányításhoz',
  },
  {
    label: 'Kikapcsolás, lejárat',
    staticQr: 'Nincs ilyen lehetőség',
    dynamicQr: 'Szüneteltethető, lejárathoz köthető',
  },
  {
    label: 'Költség',
    staticQr: 'Ingyenes, regisztráció nélkül',
    dynamicQr: 'Csomaghoz kötött, szerveroldali kiszolgálással',
  },
]
</script>

<template>
  <div class="not-prose overflow-x-auto rounded-xl border border-slate-200">
    <table class="w-full min-w-[520px] border-collapse text-left text-sm">
      <caption class="sr-only">
        Statikus és dinamikus QR-kód összehasonlítása
      </caption>
      <thead class="bg-slate-50">
        <tr>
          <th scope="col" class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">Szempont</th>
          <th scope="col" class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink">Statikus QR-kód</th>
          <th scope="col" class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink">Dinamikus QR-kód</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.label" class="border-t border-slate-200 align-top">
          <th scope="row" class="px-4 py-2.5 text-sm font-medium text-ink-soft">{{ row.label }}</th>
          <td class="px-4 py-2.5 text-sm text-ink-soft">{{ row.staticQr }}</td>
          <td class="px-4 py-2.5 text-sm text-ink-soft">{{ row.dynamicQr }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
