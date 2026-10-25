import { describe, expect, it } from 'vitest'
import { DEFAULT_PLANS, mergePlans } from '../server/utils/plans'

describe('mergePlans', () => {
  it('alapértelmezést ad, ha nincs adatbázisérték', () => {
    expect(mergePlans(null)).toEqual(DEFAULT_PLANS)
    expect(mergePlans(undefined)).toEqual(DEFAULT_PLANS)
    expect(mergePlans('hibás')).toEqual(DEFAULT_PLANS)
    expect(mergePlans([])).toEqual(DEFAULT_PLANS)
  })

  it('részleges módosítást összefésül, a többi mező marad', () => {
    const plans = mergePlans({ pro: { maxDynamicQr: 250 } })
    expect(plans.pro.maxDynamicQr).toBe(250)
    expect(plans.pro.label).toBe(DEFAULT_PLANS.pro.label)
    expect(plans.pro.analyticsDays).toBe(DEFAULT_PLANS.pro.analyticsDays)
    expect(plans.free).toEqual(DEFAULT_PLANS.free)
    expect(DEFAULT_PLANS.pro.maxDynamicQr).toBe(100)
  })

  it('funkciókapcsolókat is átvesz', () => {
    const plans = mergePlans({ free: { csvExport: true, campaigns: true } })
    expect(plans.free.csvExport).toBe(true)
    expect(plans.free.campaigns).toBe(true)
    expect(plans.free.maxDynamicQr).toBe(DEFAULT_PLANS.free.maxDynamicQr)
  })

  it('az érvénytelen értékeket figyelmen kívül hagyja', () => {
    const plans = mergePlans({
      pro: { maxDynamicQr: 'sok', analyticsDays: -5, csvExport: 'igen', unknownField: true },
    })
    expect(plans.pro).toEqual(DEFAULT_PLANS.pro)
  })

  it('az ismeretlen csomagnevet nem hozza létre', () => {
    const plans = mergePlans({ enterprise: { maxDynamicQr: 99_999 } })
    expect(Object.keys(plans).sort()).toEqual(['business', 'free', 'pro'])
  })

  it('a címke felülírható, de üresen nem', () => {
    expect(mergePlans({ business: { label: 'Nagyvállalati' } }).business.label).toBe('Nagyvállalati')
    expect(mergePlans({ business: { label: '' } }).business.label).toBe(DEFAULT_PLANS.business.label)
  })
})
