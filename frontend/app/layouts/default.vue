<template>
  <div class="flex min-h-screen flex-col">
    <a class="skip-link" href="#main-content">Ugrás a fő tartalomra</a>
    <AppHeader />
    <main id="main-content" class="flex-1" tabindex="-1">
      <slot />
    </main>
    <AppFooter />
    <CookieConsent />
  </div>
</template>
