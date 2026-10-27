/**
 * A nyilvános fejlécnek is tudnia kell, hogy be van-e jelentkezve a látogató.
 * A munkamenetet ezért már a layout előtt betöltjük, egyszer kérésenként.
 */
export default defineNuxtPlugin(async () => {
  const { user, refresh } = useUserSession()
  if (user.value) return
  await refresh()
})
