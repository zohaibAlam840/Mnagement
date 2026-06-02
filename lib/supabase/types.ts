export type UserRole = "trainee" | "supervisor"
export type CertificationTarget = "BCBA" | "BCaBA" | "RBT"
export type FieldworkType = "supervised" | "concentrated"
export type RequirementsYear = "2022" | "2027" | "both"
export type ActivityCategory = "Restricted" | "Unrestricted" | "Supervision"
export type ActivityStatus = "draft" | "submitted" | "approved" | "rejected"
export type ReviewStatus = "draft" | "submitted" | "approved" | "rejected"
export type SessionType = "individual" | "group"
export type ObservationType = "direct" | "remote" | "indirect"
export type RelationshipStatus = "pending" | "active" | "ended"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          role: UserRole
          timezone: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
      }
      trainee_profiles: {
        Row: {
          id: string
          certification_target: CertificationTarget
          fieldwork_type: FieldworkType
          requirements_year: RequirementsYear
          fieldwork_start_date: string | null
          target_hours: number
          bacb_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["trainee_profiles"]["Row"], "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["trainee_profiles"]["Insert"]>
      }
      supervisor_profiles: {
        Row: {
          id: string
          bacb_id: string | null
          certification_level: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["supervisor_profiles"]["Row"], "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["supervisor_profiles"]["Insert"]>
      }
      supervisor_relationships: {
        Row: {
          id: string
          trainee_id: string
          supervisor_id: string
          is_primary: boolean
          status: RelationshipStatus
          start_date: string | null
          end_date: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["supervisor_relationships"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["supervisor_relationships"]["Insert"]>
      }
      activity_templates: {
        Row: {
          id: string
          trainee_id: string
          title: string
          category: ActivityCategory
          subcategory: string | null
          days: string[]
          start_time: string
          end_time: string
          client_name: string | null
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["activity_templates"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["activity_templates"]["Insert"]>
      }
      activities: {
        Row: {
          id: string
          trainee_id: string
          template_id: string | null
          supervisor_id: string | null
          title: string
          date: string
          start_time: string
          end_time: string
          duration_minutes: number
          category: ActivityCategory
          subcategory: string | null
          client_name: string | null
          observation_with_client: boolean
          observation_duration_minutes: number
          observation_type: "direct" | "remote" | "indirect" | null
          supervision_present: boolean
          session_type: "individual" | "group" | null
          notes: string | null
          status: ActivityStatus
          week_start_date: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["activities"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>
      }
      weekly_reviews: {
        Row: {
          id: string
          trainee_id: string
          supervisor_id: string
          week_start_date: string
          week_end_date: string
          total_hours: number
          restricted_hours: number
          unrestricted_hours: number
          supervision_hours: number
          status: ReviewStatus
          submitted_at: string | null
          reviewed_at: string | null
          supervisor_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["weekly_reviews"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["weekly_reviews"]["Insert"]>
      }
      supervision_sessions: {
        Row: {
          id: string
          supervisor_id: string
          trainee_id: string
          date: string
          start_time: string
          end_time: string
          duration_minutes: number
          session_type: SessionType
          observation_type: ObservationType
          observation_duration_minutes: number
          notes: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["supervision_sessions"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["supervision_sessions"]["Insert"]>
      }
      monthly_summaries: {
        Row: {
          id: string
          trainee_id: string
          supervisor_id: string
          month: string
          fieldwork_type: FieldworkType
          requirements_year: RequirementsYear
          total_hours: number
          restricted_hours: number
          unrestricted_hours: number
          supervision_hours_individual: number
          supervision_hours_group: number
          observations_count: number
          observations_duration_minutes: number
          within_monthly_cap: boolean | null
          supervision_pct_met: boolean | null
          observation_requirement_met: boolean | null
          status: string
          trainee_signed_at: string | null
          supervisor_signed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["monthly_summaries"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["monthly_summaries"]["Insert"]>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          read: boolean
          related_id: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>
      }
    }
  }
}
