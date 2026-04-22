export interface BrainContext {
  userId: string
  month: string
  monthlyIncome: number
}

export interface GoalWithAllocation {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
  targetDate: Date
  priority: string
  status: string
  monthlyAporte: number
  allocatedAporte?: number
  onTrackWarning?: boolean
}
