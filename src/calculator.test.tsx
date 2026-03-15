import { describe, it, expect } from 'vitest'
import { calcSavings, calcEMI, formatINR } from './App'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from './App'
// ─── calcSavings ──────────────────────────────────────────────────────────────

describe('calcSavings', () => {
  it('returns correct maturity amount with annual compounding', () => {
    // P=100000, r=10%, n=1, t=1 → A = 100000 * 1.1 = 110000
    const result = calcSavings(100_000, 10, 1, 1)
    expect(Math.round(result.maturityAmount)).toBe(110_000)
  })

  it('computes total interest as maturityAmount minus principal', () => {
    const result = calcSavings(50_000, 8, 12, 3)
    expect(Math.round(result.totalInterest)).toBe(
      Math.round(result.maturityAmount - 50_000),
    )
  })

  it('monthly compounding gives more than annual compounding', () => {
    const monthly = calcSavings(100_000, 10, 12, 5)
    const annual = calcSavings(100_000, 10, 1, 5)
    expect(monthly.maturityAmount).toBeGreaterThan(annual.maturityAmount)
  })

  it('quarterly compounding gives correct result (known value)', () => {
    // A = 100000 * (1 + 0.08/4)^(4*1) ≈ 108243
    const result = calcSavings(100_000, 8, 4, 1)
    expect(Math.round(result.maturityAmount)).toBe(108_243)
  })

  it('returns correct number of rows equal to tenure in years', () => {
    const result = calcSavings(100_000, 7.5, 12, 10)
    expect(result.rows).toHaveLength(10)
  })

  it('each row\'s closing balance equals next row\'s opening balance', () => {
    const result = calcSavings(100_000, 7, 12, 5)
    for (let i = 0; i < result.rows.length - 1; i++) {
      expect(result.rows[i].closingBalance).toBeCloseTo(
        result.rows[i + 1].openingBalance, 2,
      )
    }
  })

  it('first row openingBalance equals principal', () => {
    const result = calcSavings(200_000, 6, 4, 3)
    expect(result.rows[0].openingBalance).toBe(200_000)
  })

  it('last row closingBalance equals maturityAmount', () => {
    const result = calcSavings(100_000, 9, 2, 4)
    const last = result.rows[result.rows.length - 1]
    expect(last.closingBalance).toBeCloseTo(result.maturityAmount, 2)
  })

  it('totalInterest is always positive for positive rate', () => {
    const result = calcSavings(100_000, 5, 12, 1)
    expect(result.totalInterest).toBeGreaterThan(0)
  })

  it('higher rate produces higher interest', () => {
    const low = calcSavings(100_000, 5, 12, 5)
    const high = calcSavings(100_000, 10, 12, 5)
    expect(high.totalInterest).toBeGreaterThan(low.totalInterest)
  })

  it('longer tenure produces higher maturity amount', () => {
    const short = calcSavings(100_000, 8, 12, 3)
    const long = calcSavings(100_000, 8, 12, 10)
    expect(long.maturityAmount).toBeGreaterThan(short.maturityAmount)
  })
})

// ─── calcEMI ─────────────────────────────────────────────────────────────────

describe('calcEMI', () => {
  it('calculates correct EMI for a standard home loan', () => {
    // ₹10L at 8.5% for 20 years — standard Indian bank benchmark
    // Expected EMI ≈ ₹8678
    const result = calcEMI(1_000_000, 8.5, 20)
    expect(Math.round(result.emi)).toBeCloseTo(8678, -1) // within ±10
  })

  it('total payable equals EMI × total months', () => {
    const result = calcEMI(500_000, 10, 5)
    expect(result.totalPayable).toBeCloseTo(result.emi * 60, 0)
  })

  it('totalInterest equals totalPayable minus principal', () => {
    const result = calcEMI(300_000, 9, 3)
    expect(result.totalInterest).toBeCloseTo(
      result.totalPayable - 300_000, 0,
    )
  })

  it('closing balance is near zero after last year', () => {
    const result = calcEMI(200_000, 8, 5)
    const last = result.rows[result.rows.length - 1]
    expect(last.closingBalance).toBeCloseTo(0, -1) // within ₹10
  })

  it('returns correct number of year rows', () => {
    const result = calcEMI(500_000, 7.5, 10)
    expect(result.rows).toHaveLength(10)
  })

  it('each row\'s closing balance equals next row\'s opening balance', () => {
    const result = calcEMI(400_000, 9, 4)
    for (let i = 0; i < result.rows.length - 1; i++) {
      expect(result.rows[i].closingBalance).toBeCloseTo(
        result.rows[i + 1].openingBalance, 1,
      )
    }
  })

  it('interest paid per year decreases over time (reducing balance)', () => {
    const result = calcEMI(500_000, 10, 5)
    for (let i = 1; i < result.rows.length; i++) {
      expect(result.rows[i].interestForYear).toBeLessThan(
        result.rows[i - 1].interestForYear,
      )
    }
  })

  it('higher interest rate means higher EMI', () => {
    const low = calcEMI(500_000, 7, 10)
    const high = calcEMI(500_000, 12, 10)
    expect(high.emi).toBeGreaterThan(low.emi)
  })

  it('higher principal means higher EMI proportionally', () => {
    const r1 = calcEMI(500_000, 9, 5)
    const r2 = calcEMI(1_000_000, 9, 5)
    expect(r2.emi).toBeCloseTo(r1.emi * 2, 0)
  })

  it('shorter tenure means higher EMI but less total interest', () => {
    const short = calcEMI(500_000, 9, 5)
    const long = calcEMI(500_000, 9, 15)
    expect(short.emi).toBeGreaterThan(long.emi)
    expect(short.totalInterest).toBeLessThan(long.totalInterest)
  })
})

// ─── formatINR ───────────────────────────────────────────────────────────────

describe('formatINR', () => {
  it('formats thousands correctly', () => {
    expect(formatINR(1000)).toBe('₹1,000')
  })

  it('formats lakhs correctly', () => {
    expect(formatINR(100_000)).toBe('₹1,00,000')
  })

  it('formats crores correctly', () => {
    expect(formatINR(10_000_000)).toBe('₹1,00,00,000')
  })

  it('rounds decimal values', () => {
    expect(formatINR(1234.56)).toBe('₹1,235')
  })

  it('handles zero', () => {
    expect(formatINR(0)).toBe('₹0')
  })
})
// ─── App component ───────────────────────────────────────────────────────────

describe('App component', () => {
  it('renders in savings mode by default', () => {
    render(<App />)
    expect(screen.getByText('Savings / FD')).toBeInTheDocument()
    expect(screen.getByLabelText('Principal (₹)')).toBeInTheDocument()
  })

  it('switches to loan mode when tab is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Loan / EMI' }))
    expect(screen.getByLabelText('Loan amount (₹)')).toBeInTheDocument()
    expect(screen.getByText('Total payable')).toBeInTheDocument()
  })

  it('shows EMI note only in loan mode', () => {
    render(<App />)
    expect(screen.queryByText(/Monthly EMI/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Loan / EMI' }))
    expect(screen.getByText(/Monthly EMI/)).toBeInTheDocument()
  })

  it('compounding select is visible in savings mode only', () => {
    render(<App />)
    expect(screen.getByLabelText('Compounding')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Loan / EMI' }))
    expect(screen.queryByLabelText('Compounding')).not.toBeInTheDocument()
  })

it('summary cards show correct labels in savings mode', () => {
  render(<App />)
  const cards = screen.getByText('Maturity amount').closest('.summary-cards')
  expect(cards).toHaveTextContent('Maturity amount')
  expect(cards).toHaveTextContent('Interest earned')
})

  it('summary cards show correct labels in loan mode', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Loan / EMI' }))
    expect(screen.getByText('Total payable')).toBeInTheDocument()
    expect(screen.getByText('Total interest')).toBeInTheDocument()
  })
})


describe('Greeting bar', () => {
  it('renders the greeting bar', () => {
    render(<App />)
    expect(screen.getByTestId('greetingg')).toBeInTheDocument()
    expect(screen.getByTestId('clock')).toBeInTheDocument()
  })
 
  it('greeting contains a valid greeting phrase', () => {
    render(<App />)
    const greeting = screen.getByTestId('greeting').textContent ?? ''
    const validGreetings = ['Good morning', 'Good afternoon', 'Good evening', 'Good night']
    expect(validGreetings.some(g => greeting.includes(g))).toBe(true)
  })
 
  it('clock shows time in correct format', () => {
    render(<App />)
    const clock = screen.getByTestId('clock').textContent ?? ''
    expect(clock).toMatch(/\d{1,2}:\d{2}:\d{2}/)
  })
})