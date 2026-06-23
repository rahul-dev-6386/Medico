export interface LabValue {
  marker: string
  test_name?: string
  value: string
  value_text?: string
  value_number?: number
  unit: string
  range: string
  reference_range?: string
  status: "normal" | "elevated" | "high" | "critical" | "low"
  flag?: string
  is_abnormal?: boolean
  trend?: "improved" | "stable" | "worsened"
}

export interface MedicalFinding {
  section: string
  items: string[]
}

export interface RiskScore {
  score: number
  risk_level: "low" | "moderate" | "high"
  overall?: "low" | "moderate" | "high"
  abnormal_count?: number
  total_labs?: number
  reasons?: { test: string; flag: string; penalty: number; message: string }[]
}

export interface ComparisonItem {
  biomarker: string
  previous: string
  current: string
  unit: string
  status: "improved" | "stable" | "worsened"
  change: string
}

export interface BiomarkerPoint {
  date: string
  value: number
}

export interface BiomarkerTimeline {
  marker: string
  unit: string
  points: BiomarkerPoint[]
}

export interface ReportInsight {
  domain: string
  label: string
  score: number
  status: "good" | "attention" | "critical"
  description: string
}

export interface TimelineEventItem {
  type: string
  title: string
  description: string
  severity: string
  date: string
}

export interface AIInsightItem {
  type: string
  title: string
  description: string
  trend: string
  severity: string
  created_at: string
}

export interface ReportSummary {
  document_type: string
  title: string
  uploaded_at: string
  ai_summary: string
  health_score: number
  risk_scores: Record<string, number>
  structured_data: any
  processed: boolean
}

export interface BiomarkerItem {
  name: string
  value: number
  value_text: string
  unit: string
  reference_range: string
  flag: string
  is_abnormal: boolean
}

export interface MedicationItem {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

export interface PatientInfo {
  name: string
  age: number
  sex: string
}

export interface StructuredData {
  document_type: string
  patient_info: PatientInfo
  diagnosis: string[]
  medications: MedicationItem[]
  lab_values: LabValue[]
  findings: string[]
  recommendations: string[]
  risk_scores: Record<string, number>
  health_score: number
  follow_up_tests: string[]
  biomarkers: BiomarkerItem[]
  timeline_events: TimelineEventItem[]
  abnormal_values: { test: string; value: string; unit: string; severity: string }[]
  body_part?: string
  impression?: string
  confidence?: string
  admission_date?: string
  discharge_date?: string
  procedures?: string[]
  follow_up_plan?: string
  doctor_info?: { name: string; registration: string }
}
