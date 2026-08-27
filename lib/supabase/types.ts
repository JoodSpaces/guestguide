// Auto-generated types from Supabase schema.
// To regenerate: npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          slug: string;
          name: string;
          name_ar: string;
          city: string;
          address: string;
          lat: number;
          lng: number;
          map_pin_lat: number;
          map_pin_lng: number;
          cover_media_id: string | null;
          bedrooms: number;
          max_guests: number;
          wifi_ssid: string | null;
          wifi_password_encrypted: string | null;
          checkin_time: string;
          checkout_time: string;
          requires_code_second_factor: boolean;
          on_call_phone: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["properties"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["properties"]["Insert"]>;
      };
      bookings: {
        Row: {
          id: string;
          property_id: string;
          external_ref: string | null;
          source: "airbnb" | "booking" | "direct" | "other";
          guest_first_name: string;
          guest_last_name: string;
          guest_phone: string | null;
          guest_email: string | null;
          guest_lang: "en" | "ar";
          guest_count: number;
          check_in: string;
          check_out: string;
          door_code_encrypted: string | null;
          status: "confirmed" | "cancelled" | "completed";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
      };
      stay_tokens: {
        Row: {
          id: string;
          booking_id: string;
          token_hash: string;
          issued_at: string;
          expires_at: string;
          first_opened_at: string | null;
          last_opened_at: string | null;
          open_count: number;
          revoked_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["stay_tokens"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["stay_tokens"]["Insert"]>;
      };
      property_content: {
        Row: {
          id: string;
          property_id: string;
          section: string;
          sort_order: number;
          title_en: string;
          title_ar: string;
          body_en: string;
          body_ar: string;
          media_ids: string[];
          is_published: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["property_content"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["property_content"]["Insert"]>;
      };
      services: {
        Row: {
          id: string;
          property_id: string | null;
          name_en: string;
          name_ar: string;
          description_en: string;
          description_ar: string;
          price_egp: number;
          mode: "instant" | "request";
          lead_time_hours: number;
          is_active: boolean;
          media_id: string | null;
          sort_order: number;
        };
        Insert: Omit<Database["public"]["Tables"]["services"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["services"]["Insert"]>;
      };
      service_orders: {
        Row: {
          id: string;
          booking_id: string;
          service_id: string;
          mode: "instant" | "request";
          status: "requested" | "confirmed" | "awaiting_payment" | "paid" | "delivered" | "declined" | "cancelled";
          quantity: number;
          notes: string | null;
          amount_egp: number;
          paymob_order_id: string | null;
          paymob_transaction_id: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["service_orders"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["service_orders"]["Insert"]>;
      };
      requests: {
        Row: {
          id: string;
          booking_id: string;
          category: "maintenance" | "housekeeping" | "supplies" | "service" | "other";
          body: string;
          media_ids: string[];
          urgency: "normal" | "urgent";
          status: "received" | "in_progress" | "resolved";
          created_at: string;
          resolved_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["requests"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["requests"]["Insert"]>;
      };
      request_messages: {
        Row: {
          id: string;
          request_id: string;
          author: "guest" | "team";
          body: string;
          media_ids: string[];
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["request_messages"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["request_messages"]["Insert"]>;
      };
      recommendations: {
        Row: {
          id: string;
          scope: "global" | "city" | "property";
          city: string | null;
          property_id: string | null;
          category: string;
          name: string;
          blurb_en: string;
          blurb_ar: string;
          lat: number | null;
          lng: number | null;
          price_band: number | null;
          phone: string | null;
          url: string | null;
          jood_can_arrange: boolean;
          media_ids: string[];
          sort_order: number;
        };
        Insert: Omit<Database["public"]["Tables"]["recommendations"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["recommendations"]["Insert"]>;
      };
      guest_contacts: {
        Row: {
          id: string;
          booking_id: string;
          email: string | null;
          phone: string | null;
          consent_marketing: boolean;
          consent_at: string;
          source: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["guest_contacts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["guest_contacts"]["Insert"]>;
      };
      guest_documents: {
        Row: {
          id: string;
          booking_id: string;
          doc_type: string;
          storage_path: string;
          uploaded_at: string;
          delete_after: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["guest_documents"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["guest_documents"]["Insert"]>;
      };
      media: {
        Row: {
          id: string;
          storage_path: string;
          kind: "image" | "video";
          alt_en: string;
          alt_ar: string;
          width: number | null;
          height: number | null;
          blurhash: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["media"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["media"]["Insert"]>;
      };
      audit_log: {
        Row: {
          id: string;
          actor_type: string;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string;
          meta: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_log"]["Row"], "id" | "created_at">;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
