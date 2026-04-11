// Seeded random for reproducible analytics data
function seededRandom(seed) {
  let s = seed
  return function () {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function generateAnalytics(days = 30, seed = 42) {
  const rand = seededRandom(seed)
  const data = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // Simulate realistic traffic patterns (weekdays higher)
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const baseFactor = isWeekend ? 0.6 : 1.0

    // Trend: gradually increasing views over time
    const trendFactor = 1 + (days - i) * 0.02

    const views = Math.round((40 + rand() * 60) * baseFactor * trendFactor)
    const saves = Math.round(views * (0.06 + rand() * 0.04))
    const viewingRequests = Math.round(views * (0.02 + rand() * 0.02))
    const contactRequests = Math.round(views * (0.01 + rand() * 0.015))

    data.push({
      date: date.toISOString().split('T')[0],
      dateLabel: date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
      views,
      saves,
      viewingRequests,
      contactRequests,
    })
  }

  return data
}

export function getAnalyticsSummary(data) {
  const totals = data.reduce(
    (acc, day) => ({
      totalViews: acc.totalViews + day.views,
      totalSaves: acc.totalSaves + day.saves,
      totalViewingRequests: acc.totalViewingRequests + day.viewingRequests,
      totalContactRequests: acc.totalContactRequests + day.contactRequests,
    }),
    { totalViews: 0, totalSaves: 0, totalViewingRequests: 0, totalContactRequests: 0 }
  )

  const last7 = data.slice(-7)
  const prev7 = data.slice(-14, -7)

  const recentViews = last7.reduce((s, d) => s + d.views, 0)
  const prevViews = prev7.reduce((s, d) => s + d.views, 0)
  const viewsTrend = prevViews > 0 ? ((recentViews - prevViews) / prevViews) * 100 : 0

  return {
    ...totals,
    avgDailyViews: Math.round(totals.totalViews / data.length),
    viewsTrend: Math.round(viewsTrend),
    conversionRate: ((totals.totalViewingRequests / totals.totalViews) * 100).toFixed(1),
  }
}
