export interface Branch {
  code: string
  name: string
  isAdmin?: boolean
}

export const BRANCHES: Branch[] = [
  { code: '1001', name: 'עין המפרץ' },
  { code: '1002', name: 'ביאליק קרן היסוד' },
  { code: '1003', name: 'מוצקין הילדים' },
  { code: '1004', name: 'צור שלום' },
  { code: '1005', name: 'גושן 60' },
  { code: '1006', name: 'נהריה הגעתון' },
  { code: '1007', name: 'ההסתדרות' },
  { code: '1008', name: 'משכנות האומנים' },
  { code: '1009', name: 'רון קריית ביאליק' },
]

export const ADMIN_BRANCH: Branch = { code: '9999', name: 'ADMIN', isAdmin: true }

export const ALL_BRANCHES: Branch[] = [...BRANCHES, ADMIN_BRANCH]

export const BRANCH_NAMES: string[] = BRANCHES.map(b => b.name)

export const BRANCH_BY_CODE: Record<string, string> = Object.fromEntries(
  ALL_BRANCHES.map(b => [b.code, b.name])
)

export function getBranchName(code: string): string | undefined {
  return BRANCH_BY_CODE[code]
}
