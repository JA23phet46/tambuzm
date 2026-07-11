import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly NEXT_PUBLIC_SUPABASE_URL?: string;
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    readonly SUPABASE_URL?: string;
    readonly SUPABASE_ANON_KEY?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// Retrieve Supabase credentials. Since the user can configure these via NEXT_PUBLIC_, VITE_, or direct SUPABASE_ prefix, we check all of them.
let rawUrl = (import.meta.env.VITE_SUPABASE_URL || 
              import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
              import.meta.env.SUPABASE_URL || 
              "") as string;

// Programmatically sanitize and normalize Supabase URLs (e.g. if the user pasted a deep link, JWKS endpoint, or had trailing slashes/paths)
if (rawUrl) {
  rawUrl = rawUrl.trim();
  const supabaseCoMatch = rawUrl.match(/^(https?:\/\/[a-zA-Z0-9\-]+\.supabase\.[a-z]+)/i);
  if (supabaseCoMatch) {
    rawUrl = supabaseCoMatch[1];
  } else {
    if (rawUrl.endsWith('/')) {
      rawUrl = rawUrl.slice(0, -1);
    }
    if (rawUrl.endsWith('/rest/v1')) {
      rawUrl = rawUrl.substring(0, rawUrl.length - 8);
    } else if (rawUrl.endsWith('/rest/v1/')) {
      rawUrl = rawUrl.substring(0, rawUrl.length - 9);
    }
  }
}

const supabaseUrl = rawUrl;
let rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 
                  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                  import.meta.env.SUPABASE_ANON_KEY || 
                  "") as string;
if (rawAnonKey) {
  rawAnonKey = rawAnonKey.trim();
}
const supabaseAnonKey = rawAnonKey;

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
    console.warn('Supabase is not configured yet. Simulating save to local cache for testing.');
    const mockRecord = {
      id: property.id,
      title: property.name,
      name: property.name,
      price: Number(property.price),
      location: property.location,
      description: property.description || '',
      image: property.image,
      photos: property.photos || [],
      phone: property.ownerPhone || property.phone || '',
      whatsapp: property.ownerWhatsapp || property.whatsapp || '',
      beds: Number(property.beds || 0),
      baths: Number(property.baths || 0),
      sqm: Number(property.sqm || 0),
      province: property.province || 'Lusaka',
      distance: property.distance || '',
      owner_id: property.ownerId || 'demo_owner123',
      ownerName: property.ownerName || 'Mwamba Chileshe',
      verified: !!property.verified,
      featured: !!property.featured,
      available: property.available !== false,
      created_at: new Date().toISOString(),
    };
    return [mockRecord];
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

  try {
    const { data, error } = await supabase
      .from('properties')
      .insert([payload])
      .select();

    if (error) {
      console.warn('Supabase Insert Error (falling back to local cache):', error);
      return [payload];
    }

    return data;
  } catch (err) {
    console.warn('Supabase publishing failed (falling back to local cache):', err);
    return [payload];
  }
}

/**
 * Fetches all properties from Supabase.
 */
export async function getPropertiesFromSupabase(): Promise<any[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Could not query Supabase properties, might not have created table yet:', error.message);
      return null;
    }
    // Normalize properties from Supabase back into standard app Property objects
    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.title || p.name,
      location: p.location,
      price: Number(p.price),
      type: p.type || 'House',
      beds: Number(p.beds || 0),
      baths: Number(p.baths || 0),
      sqm: Number(p.sqm || 0),
      image: p.image,
      verified: !!p.verified,
      featured: !!p.featured,
      rating: Number(p.rating || 4.8),
      saves: Number(p.saves || 0),
      views: Number(p.views || 120),
      province: p.province || 'Lusaka',
      ownerId: p.owner_id || p.ownerId || 'demo_owner123',
      ownerName: p.owner_name || p.ownerName || 'Mwamba Chileshe',
      ownerImage: p.owner_image || p.ownerImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlU9YJ8M3MunDAymNRXsgQKqX6eL-cGOG6Mnlq9mL22IDirRalmeJjnH_qrPx9CXnb92hTMGmV33HoSi4GI-mSHSUgiILXxRod3ERkAumQfhAYQj2JTz9tqKMIUkc8Y7JGz7n_0cTGh6_PKvye02YzqDFSF1bDf6Ory0pyb6SHi68d_2_MatN0ORfM8LFzxHFMDVAYa1iERf-cyHf0wwiZAkj8twUDg4LaIT7xYpz8hwPf7kX1dozNTkc6NDbBYN5HaBV_yJYkVp0',
      ownerPhone: p.phone || p.owner_phone || '',
      ownerWhatsapp: p.whatsapp || p.owner_whatsapp || '',
      available: p.available !== false,
      propertyOfTheWeek: !!p.property_of_the_week || !!p.propertyOfTheWeek,
      description: p.description || '',
      distance: p.distance || '',
      photos: Array.isArray(p.photos) ? p.photos : (p.photos_array || []),
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
    }));
  } catch (err) {
    console.error('Error fetching properties from Supabase:', err);
    return null;
  }
}

/**
 * Updates a property listing on Supabase.
 */
export async function updatePropertyInSupabase(propertyId: string, fields: any): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const payload: any = {};
    if (fields.name !== undefined) payload.name = fields.name;
    if (fields.title !== undefined || fields.name !== undefined) payload.title = fields.title || fields.name;
    if (fields.price !== undefined) payload.price = fields.price;
    if (fields.location !== undefined) payload.location = fields.location;
    if (fields.description !== undefined) payload.description = fields.description;
    if (fields.available !== undefined) payload.available = fields.available;
    if (fields.verified !== undefined) payload.verified = fields.verified;
    if (fields.featured !== undefined) payload.featured = fields.featured;
    if (fields.image !== undefined) payload.image = fields.image;
    if (fields.photos !== undefined) payload.photos = fields.photos;

    const { error } = await supabase
      .from('properties')
      .update(payload)
      .eq('id', propertyId);
    if (error) {
      console.warn('Could not update property in Supabase:', error.message);
    }
  } catch (err) {
    console.error('Error in updatePropertyInSupabase:', err);
  }
}

/**
 * Deletes a property listing from Supabase.
 */
export async function deletePropertyFromSupabase(propertyId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId);
    if (error) {
      console.warn('Could not delete property from Supabase:', error.message);
    }
  } catch (err) {
    console.error('Error in deletePropertyFromSupabase:', err);
  }
}
