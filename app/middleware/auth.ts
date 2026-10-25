export default defineNuxtRouteMiddleware(async (to) => {
  const { user, refresh } = useUserSession()
  if (!user.value) await refresh()
  if (!user.value) {
    return navigateTo({ path: '/belepes', query: { redirect: to.fullPath } })
  }
})
