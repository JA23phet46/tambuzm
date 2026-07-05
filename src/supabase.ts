import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve Supabase credentials. Since the user can configure these via NEXT_PUBLIC_ or VITE_, we check both.
const supabaseUrl = (import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL) as string;
const supabaseAnonKey = (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
    }
  }
  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey;
}

/**
 * Converts a base64 Data URL to a Blob and uploads it to the Supabase Storage bucket 'property-images'.
 * Falls back to returning null if it is not a base64 string or if the upload fails.
 */
export async function uploadImageToSupabase(imageString: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, skipping photo upload.');
    return null;
  }

  // If the image is already a remote URL (like Unsplash), just return it directly
  if (!imageString.startsWith('data:')) {
    return imageString;
  }

  try {
    // Generate a unique filename
    const fileExtension = imageString.substring(imageString.indexOf('/') + 1, imageString.indexOf(';'));
    const uniqueId = Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    const fileName = `${uniqueId}.${fileExtension || 'jpg'}`;

    // Elegant base64 to Blob conversion via fetch API
    const res = await fetch(imageString);
    const blob = await res.blob();

    // Upload to 'property-images' bucket
    const { data, error } = await supabase.storage
      .from('property-images')
      .upload(fileName, blob, {
        contentType: blob.type || 'image/jpeg',
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Get public accessible URL
    const { data: publicUrlData } = supabase.storage
      .from('property-images')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Error uploading image to Supabase Storage:', err);
    return null;
  }
}

/**
 * Saves listing data directly to the Supabase database table 'properties'.
 * Uses dual-naming keys (camelCase and snake_case) to match any columns the user set up.
 */
export async function savePropertyToSupabase(property: any): Promise<any> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured yet. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on your Vercel or local environment.');
  }

  // Upload first image if it is base64
  let mainImageUrl = property.image;
  if (mainImageUrl && mainImageUrl.startsWith('data:')) {
    const uploadedUrl = await uploadImageToSupabase(mainImageUrl);
    if (uploadedUrl) {
      mainImageUrl = uploadedUrl;
    }
  }

  // Upload all photos in the array if they are base64
  const uploadedPhotos: string[] = [];
  if (Array.isArray(property.photos)) {
    for (const photo of property.photos) {
      if (photo.startsWith('data:')) {
        const uploadedUrl = await uploadImageToSupabase(photo);
        if (uploadedUrl) {
          uploadedPhotos.push(uploadedUrl);
        } else {
          uploadedPhotos.push(photo);
        }
      } else {
        uploadedPhotos.push(photo);
      }
    }
  }

  // Create robust payload supporting both title/name, owner_id/ownerId and snake_case database schema
  const payload = {
    id: property.id,
    
    // Title mapping
    title: property.name,
    name: property.name,
    
    price: Number(property.price),
    location: property.location,
    description: property.description || '',
    
    // Image and Photos mapping
    image: mainImageUrl,
    photos: uploadedPhotos,
    photos_array: uploadedPhotos,
    
    // Contact mappings
    phone: property.ownerPhone || property.phone || '',
    whatsapp: property.ownerWhatsapp || property.whatsapp || '',
    owner_phone: property.ownerPhone || property.phone || '',
    owner_whatsapp: property.ownerWhatsapp || property.whatsapp || '',
    
    // Optional mappings
    beds: Number(property.beds || 0),
    baths: Number(property.baths || 0),
    sqm: Number(property.sqm || 0),
    province: property.province || 'Lusaka',
    distance: property.distance || '',
    
    // Owner mappings
    owner_id: property.ownerId || 'demo_owner123',
    ownerId: property.ownerId || 'demo_owner123',
    owner_name: property.ownerName || 'Mwamba Chileshe',
    ownerName: property.ownerName || 'Mwamba Chileshe',
    
    verified: !!property.verified,
    featured: !!property.featured,
    available: property.available !== false,
    
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('properties')
    .insert([payload])
    .select();

  if (error) {
    console.error('Supabase Insert Error:', error);
    throw error;
  }

  return data;
}
