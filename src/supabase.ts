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

export function getCustomSupabaseConfig() {
  try {
    const url = localStorage.getItem('tambu_custom_supabase_url');
    const key = localStorage.getItem('tambu_custom_supabase_key');
    if (url && key) {
      return { url: url.trim(), key: key.trim() };
    }
  } catch (e) {}
  return null;
}

export function saveCustomSupabaseConfig(url: string, key: string) {
  try {
    localStorage.setItem('tambu_custom_supabase_url', url.trim());
    localStorage.setItem('tambu_custom_supabase_key', key.trim());
    supabaseInstance = null;
  } catch (e) {}
}

export function clearCustomSupabaseConfig() {
  try {
    localStorage.removeItem('tambu_custom_supabase_url');
    localStorage.removeItem('tambu_custom_supabase_key');
    supabaseInstance = null;
  } catch (e) {}
}

export function getSupabaseClient(): SupabaseClient | null {
  // 1. First priority: user-configured custom keys
  const custom = getCustomSupabaseConfig();
  if (custom && custom.url && custom.key) {
    if (!supabaseInstance || (supabaseInstance as any).supabaseUrl !== custom.url) {
      try {
        supabaseInstance = createClient(custom.url, custom.key);
      } catch (e) {
        console.error('Failed to init Custom Supabase:', e);
      }
    }
    return supabaseInstance;
  }

  // 2. Second priority: compile-time environment variables
  let url = supabaseUrl;
  let key = supabaseAnonKey;

  // 3. Third priority: server-provided runtime environment variables cached in localStorage
  if (!url || !key) {
    try {
      const sUrl = localStorage.getItem('tambu_server_supabase_url');
      const sKey = localStorage.getItem('tambu_server_supabase_key');
      if (sUrl && sKey) {
        url = sUrl.trim();
        key = sKey.trim();
      }
    } catch (e) {}
  }

  if (!url || !key) {
    return null;
  }

  if (!supabaseInstance || (supabaseInstance as any).supabaseUrl !== url) {
    try {
      supabaseInstance = createClient(url, key);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
    }
  }
  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  const custom = getCustomSupabaseConfig();
  if (custom && custom.url && custom.key) return true;
  if (supabaseUrl && supabaseAnonKey) return true;
  try {
    const sUrl = localStorage.getItem('tambu_server_supabase_url');
    const sKey = localStorage.getItem('tambu_server_supabase_key');
    return !!(sUrl && sKey);
  } catch (e) {}
  return false;
}

export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Supabase client is not initialized. Please add your credentials.' };
  }
  try {
    const { error } = await supabase.from('properties').select('id').limit(1);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
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
      console.error('Supabase Insert Error:', error);
      throw new Error(`Failed to save to Supabase: ${error.message}. Please verify your tables and permissions.`);
    }

    return data;
  } catch (err: any) {
    console.error('Supabase publishing failed:', err);
    throw err;
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
      console.error('Could not update property in Supabase:', error.message);
      throw new Error(`Failed to update Supabase: ${error.message}`);
    }
  } catch (err: any) {
    console.error('Error in updatePropertyInSupabase:', err);
    throw err;
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
      console.error('Could not delete property from Supabase:', error.message);
      throw new Error(`Failed to delete from Supabase: ${error.message}`);
    }
  } catch (err: any) {
    console.error('Error in deletePropertyFromSupabase:', err);
    throw err;
  }
}

