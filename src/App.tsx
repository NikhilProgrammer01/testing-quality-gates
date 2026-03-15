import { useState, useMemo, useEffect } from 'react'
import './App.css'

// ─── Greeting logic (exported for tests) ─────────────────────────────────────

export function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

// ─── Pure calculation logic (also exported for tests) ─────────────────────────

export type CompoundingFrequency = 1 | 2 | 4 | 12

export interface YearRow {
  year: number
  openingBalance: number
  interestForYear: number
  closingBalance: number
}

export interface SavingsResult {
  maturityAmount: number
  totalInterest: number
  rows: YearRow[]
}

export interface LoanResult {
  emi: number
  totalPayable: number
  totalInterest: number
  rows: YearRow[]
}

export function calcSavings(
  principal: number,
  annualRate: number,
  frequencyPerYear: CompoundingFrequency,
  years: number,
): SavingsResult {
  const r = annualRate / 100
  const rPerPeriod = r / frequencyPerYear
  const rows: YearRow[] = []
  let balance = principal

  for (let yr = 1; yr <= years; yr++) {
    const openingBalance = balance
    let interestForYear = 0

    for (let p = 0; p < frequencyPerYear; p++) {
      const periodInterest = balance * rPerPeriod
      interestForYear += periodInterest
      balance += periodInterest
    }

    rows.push({ year: yr, openingBalance, interestForYear, closingBalance: balance })
  }

  return {
    maturityAmount: balance,
    totalInterest: balance - principal,
    rows,
  }
}

export function calcEMI(
  principal: number,
  annualRate: number,
  years: number,
): LoanResult {
  const monthlyRate = annualRate / 100 / 12
  const totalMonths = years * 12

  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1)

  const rows: YearRow[] = []
  let balance = principal

  for (let yr = 1; yr <= years; yr++) {
    const openingBalance = balance
    let interestForYear = 0

    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break
      const monthInterest = balance * monthlyRate
      const monthPrincipal = emi - monthInterest
      interestForYear += monthInterest
      balance = Math.max(0, balance - monthPrincipal)
    }

    rows.push({
      year: yr,
      openingBalance,
      interestForYear,
      closingBalance: balance,
    })
  }

  const totalPayable = emi * totalMonths
  return {
    emi,
    totalPayable,
    totalInterest: totalPayable - principal,
    rows,
  }
}

export function formatINR(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN')
}

// ─── Component ────────────────────────────────────────────────────────────────

type Mode = 'savings' | 'loan'

const FREQUENCIES: { label: string; value: CompoundingFrequency }[] = [
  { label: 'Monthly', value: 12 },
  { label: 'Quarterly', value: 4 },
  { label: 'Half-yearly', value: 2 },
  { label: 'Annually', value: 1 },
]

function App() {
  const [mode, setMode] = useState<Mode>('savings')
  const [principal, setPrincipal] = useState(100_000)
  const [rate, setRate] = useState(7.5)
  const [years, setYears] = useState(5)
  const [frequency, setFrequency] = useState<CompoundingFrequency>(12)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const savings = useMemo(
    () => (mode === 'savings' ? calcSavings(principal, rate, frequency, years) : null),
    [mode, principal, rate, frequency, years],
  )

  const loan = useMemo(
    () => (mode === 'loan' ? calcEMI(principal, rate, years) : null),
    [mode, principal, rate, years],
  )

  const totalAmount = savings?.maturityAmount ?? loan?.totalPayable ?? 0
  const totalInterest = savings?.totalInterest ?? loan?.totalInterest ?? 0
  const rows = savings?.rows ?? loan?.rows ?? []
  const principalPct = totalAmount > 0 ? (principal / totalAmount) * 100 : 0
  const interestPct = 100 - principalPct

  return (
    <>
      <div className="greeting-bar">
        <span data-testid="greeting">{getGreeting(now.getHours())}, have a great dayyy!</span>
        <span data-testid="clock">{formatTime(now)}</span>
      </div>

      <div className="calculator">
        <h1>Bank calculator</h1>
        <p className="subtitle">Compound interest for savings &amp; loans</p>

        <div className="tabs">
          {(['savings', 'loan'] as Mode[]).map((m) => (
            <button
              key={m}
              className={`tab ${mode === m ? 'active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'savings' ? 'Savings / FD' : 'Loan / EMI'}
            </button>
          ))}
        </div>

        <div className="input-grid">
          <div className="field">
            <label htmlFor="principal">
              {mode === 'loan' ? 'Loan amount (₹)' : 'Principal (₹)'}
            </label>
            <input
              id="principal"
              type="number"
              value={principal}
              min={1000}
              step={1000}
              onChange={(e) => setPrincipal(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="rate">Annual interest rate (%)</label>
            <input
              id="rate"
              type="number"
              value={rate}
              min={0.1}
              max={36}
              step={0.1}
              onChange={(e) => setRate(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="years">Tenure (years)</label>
            <input
              id="years"
              type="number"
              value={years}
              min={1}
              max={30}
              step={1}
              onChange={(e) => setYears(Number(e.target.value))}
            />
          </div>
          {mode === 'savings' && (
            <div className="field">
              <label htmlFor="frequency">Compounding</label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value) as CompoundingFrequency)}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loan && (
          <div className="emi-note">
            Monthly EMI: <strong>{formatINR(loan.emi)}</strong>&nbsp;&nbsp;·&nbsp;&nbsp;
            Total months: <strong>{years * 12}</strong>
          </div>
        )}

        <div className="summary-cards">
          <div className="summary-card">
            <span className="card-label">
              {mode === 'savings' ? 'Maturity amount' : 'Total payable'}
            </span>
            <span className="card-value">{formatINR(totalAmount)}</span>
          </div>
          <div className="summary-card">
            <span className="card-label">Principal</span>
            <span className="card-value">{formatINR(principal)}</span>
          </div>
          <div className="summary-card">
            <span className="card-label">
              {mode === 'savings' ? 'Interest earned' : 'Total interest'}
            </span>
            <span className={`card-value ${mode === 'savings' ? 'green' : 'amber'}`}>
              {formatINR(totalInterest)}
            </span>
          </div>
        </div>

        <div className="breakdown">
          <h3>Breakdown</h3>
          <div className="bar-row">
            <span className="bar-label">Principal</span>
            <div className="bar-track">
              <div className="bar-fill principal" style={{ width: `${principalPct}%` }} />
            </div>
            <span className="bar-pct">{principalPct.toFixed(1)}%</span>
          </div>
          <div className="bar-row">
            <span className="bar-label">{mode === 'savings' ? 'Interest' : 'Interest cost'}</span>
            <div className="bar-track">
              <div className="bar-fill interest" style={{ width: `${interestPct}%` }} />
            </div>
            <span className="bar-pct">{interestPct.toFixed(1)}%</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Opening balance</th>
                <th>{mode === 'savings' ? 'Interest earned' : 'Interest paid'}</th>
                <th>Closing balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td>{formatINR(row.openingBalance)}</td>
                  <td>{formatINR(row.interestForYear)}</td>
                  <td>{formatINR(row.closingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default App