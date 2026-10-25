<template>
  <div class="min-h-screen bg-slate-50">
    <header class="border-b border-slate-200 bg-surface">
      <div class="container-page flex h-16 items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <AppLogo />
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Admin
          </span>
        </div>
        <NuxtLink to="/" class="text-sm font-medium text-ink-muted hover:text-brand-700">
          Vissza az oldalra
        </NuxtLink>
      </div>
    </header>
    <main class="container-page py-8">
      <slot />
    </main>
  </div>
</template>
