import { supabase } from './supabase';

// Mock DB and Storage objects to conform to Firebase client API signatures
export const db = {};
export const storage = {};

export const auth = {
  get currentUser() {
    const localUser = localStorage.getItem('reels_current_user');
    if (localUser) {
      try {
        const u = JSON.parse(localUser);
        return {
          uid: u.id,
          email: u.username + '@example.com',
          displayName: u.displayName,
          emailVerified: true,
          isAnonymous: false,
          tenantId: null,
          providerData: [] as { providerId: string | null; email: string | null; }[]
        };
      } catch {}
    }
    return null;
  }
};

export class GoogleAuthProvider {}

// Local storage key names
const KEYS = {
  USERS: 'reels_users',
  VIDEOS: 'reels_videos',
  COMMENTS: 'reels_comments',
  CURRENT_USER: 'reels_current_user',
  MESSAGES: 'reels_messages',
  STORIES: 'reels_stories',
};


// --- Firestore Bridge ---

export function collection(dbInstance: any, path: string) {
  return { type: 'collection', path, collectionName: path };
}

export function doc(parentRef: any, idOrPath: string, id?: string) {
  if (parentRef && parentRef.type === 'collection') {
    return {
      type: 'doc',
      collectionName: parentRef.collectionName,
      id: idOrPath,
      path: `${parentRef.collectionName}/${idOrPath}`
    };
  }
  
  // doc(db, 'users', userId) signature
  const collectionName = idOrPath;
  return {
    type: 'doc',
    collectionName,
    id: id,
    path: `${collectionName}/${id}`
  };
}

export async function getDoc(docRef: any) {
  const collectionName = docRef.collectionName;
  const id = docRef.id;
  
  try {
    const { data, error } = await supabase.from(collectionName).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    
    if (data) {
      return {
        exists: () => true,
        data: () => data,
        id: data.id,
      };
    }
  } catch (err) {
    console.warn(`Supabase getDoc fallback for ${collectionName}/${id}`, err);
  }
  
  // LocalStorage Fallback
  const localList = JSON.parse(localStorage.getItem(`reels_${collectionName}`) || '[]');
  const localItem = localList.find((item: any) => item.id === id);
  return {
    exists: () => !!localItem,
    data: () => localItem || null,
    id: id,
  };
}

export async function getDocs(collectionRef: any) {
  const collectionName = collectionRef.collectionName;
  
  try {
    const { data, error } = await supabase.from(collectionName).select('*');
    if (error) throw error;
    
    if (data) {
      return {
        empty: data.length === 0,
        forEach: (callback: any) => {
          data.forEach((docData: any) => {
            callback({
              id: docData.id,
              data: () => docData,
            });
          });
        }
      };
    }
  } catch (err) {
    console.warn(`Supabase getDocs fallback for ${collectionName}`, err);
  }
  
  // LocalStorage Fallback
  const localList = JSON.parse(localStorage.getItem(`reels_${collectionName}`) || '[]');
  return {
    empty: localList.length === 0,
    forEach: (callback: any) => {
      localList.forEach((docData: any) => {
        callback({
          id: docData.id,
          data: () => docData,
        });
      });
    }
  };
}

export async function setDoc(docRef: any, data: any) {
  const collectionName = docRef.collectionName;
  const id = docRef.id;
  const finalData = { ...data, id };
  
  try {
    const { error } = await supabase.from(collectionName).upsert(finalData);
    if (error) throw error;
  } catch (err) {
    console.warn(`Supabase setDoc fallback for ${collectionName}/${id}`, err);
  }
  
  // Save locally
  const localList = JSON.parse(localStorage.getItem(`reels_${collectionName}`) || '[]');
  const index = localList.findIndex((item: any) => item.id === id);
  if (index !== -1) {
    localList[index] = finalData;
  } else {
    localList.push(finalData);
  }
  localStorage.setItem(`reels_${collectionName}`, JSON.stringify(localList));
  window.dispatchEvent(new Event('reels-data-updated'));
}

export async function updateDoc(docRef: any, updateFields: any) {
  const collectionName = docRef.collectionName;
  const id = docRef.id;
  
  let existingData: any = null;
  const localList = JSON.parse(localStorage.getItem(`reels_${collectionName}`) || '[]');
  const localIndex = localList.findIndex((item: any) => item.id === id);
  if (localIndex !== -1) {
    existingData = { ...localList[localIndex] };
  }
  
  try {
    const { data, error } = await supabase.from(collectionName).select('*').eq('id', id).maybeSingle();
    if (!error && data) {
      existingData = data;
    }
  } catch {}
  
  if (!existingData) {
    existingData = { id };
  }
  
  const resolvedFields: any = {};
  for (const [key, value] of Object.entries(updateFields)) {
    if (value && typeof value === 'object' && (value as any)._type === 'increment') {
      const currentVal = Number(existingData[key]) || 0;
      resolvedFields[key] = currentVal + (value as any).value;
    } else if (value && typeof value === 'object' && (value as any)._type === 'arrayUnion') {
      const currentArray = Array.isArray(existingData[key]) ? existingData[key] : [];
      const itemsToAdd = (value as any).values;
      const newArray = [...currentArray];
      itemsToAdd.forEach((item: any) => {
        if (!newArray.includes(item)) {
          newArray.push(item);
        }
      });
      resolvedFields[key] = newArray;
    } else if (value && typeof value === 'object' && (value as any)._type === 'arrayRemove') {
      const currentArray = Array.isArray(existingData[key]) ? existingData[key] : [];
      const itemsToRemove = (value as any).values;
      resolvedFields[key] = currentArray.filter((item: any) => !itemsToRemove.includes(item));
    } else {
      resolvedFields[key] = value;
    }
  }
  
  const mergedData = { ...existingData, ...resolvedFields };
  
  try {
    const { error } = await supabase.from(collectionName).upsert(mergedData);
    if (error) throw error;
  } catch (err) {
    console.warn(`Supabase updateDoc fallback for ${collectionName}/${id}`, err);
  }
  
  if (localIndex !== -1) {
    localList[localIndex] = mergedData;
  } else {
    localList.push(mergedData);
  }
  localStorage.setItem(`reels_${collectionName}`, JSON.stringify(localList));
  
  const currentLocal = JSON.parse(localStorage.getItem('reels_current_user') || '{}');
  if (currentLocal.id === id) {
    localStorage.setItem('reels_current_user', JSON.stringify(mergedData));
  }
  
  window.dispatchEvent(new Event('reels-data-updated'));
}

export async function deleteDoc(docRef: any) {
  const collectionName = docRef.collectionName;
  const id = docRef.id;
  
  try {
    const { error } = await supabase.from(collectionName).delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.warn(`Supabase deleteDoc fallback for ${collectionName}/${id}`, err);
  }
  
  const localList = JSON.parse(localStorage.getItem(`reels_${collectionName}`) || '[]');
  const filtered = localList.filter((item: any) => item.id !== id);
  localStorage.setItem(`reels_${collectionName}`, JSON.stringify(filtered));
  window.dispatchEvent(new Event('reels-data-updated'));
}

export async function addDoc(collectionRef: any, data: any) {
  const collectionName = collectionRef.collectionName;
  const autoId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const docRef = doc(collectionRef, autoId);
  await setDoc(docRef, data);
  return { id: autoId };
}

export function query(collectionRef: any, ...constraints: any[]) {
  return {
    ...collectionRef,
    constraints: constraints
  };
}

export function where(field: string, op: string, val: any) {
  return { type: 'where', field, op, val };
}

export function orderBy(field: string, direction: string = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function increment(n: number) {
  return { _type: 'increment', value: n };
}

export function arrayUnion(...elements: any[]) {
  return { _type: 'arrayUnion', values: elements };
}

export function arrayRemove(...elements: any[]) {
  return { _type: 'arrayRemove', values: elements };
}

export function writeBatch(dbInstance: any) {
  const operations: (() => Promise<void>)[] = [];
  return {
    set: (docRef: any, data: any) => {
      operations.push(() => setDoc(docRef, data));
    },
    update: (docRef: any, data: any) => {
      operations.push(() => updateDoc(docRef, data));
    },
    commit: async () => {
      for (const op of operations) {
        await op();
      }
    }
  };
}

export function onSnapshot(refObj: any, onNext: (snapshot: any) => void, onError?: (error: any) => void) {
  const collectionName = refObj.collectionName;
  const constraints = refObj.constraints || [];
  
  const triggerFetch = async () => {
    try {
      let queryBuilder: any = supabase.from(collectionName).select('*');
      constraints.forEach((c: any) => {
        if (c.type === 'where' && c.op === '==') {
          queryBuilder = queryBuilder.eq(c.field, c.val);
        }
      });

      
      const { data, error } = await queryBuilder;
      if (error) throw error;
      
      if (data) {
        onNext({
          empty: data.length === 0,
          forEach: (callback: any) => {
            data.forEach((docData: any) => {
              callback({
                id: docData.id,
                data: () => docData,
              });
            });
          },
          docChanges: () => []
        });
      }
    } catch (err) {
      const localList = JSON.parse(localStorage.getItem(`reels_${collectionName}`) || '[]');
      let filtered = [...localList];
      
      constraints.forEach((c: any) => {
        if (c.type === 'where' && c.op === '==') {
          filtered = filtered.filter((item: any) => item[c.field] === c.val);
        }
      });
      
      onNext({
        empty: filtered.length === 0,
        forEach: (callback: any) => {
          filtered.forEach((docData: any) => {
            callback({
              id: docData.id,
              data: () => docData,
            });
          });
        },
        docChanges: () => []
      });
    }
  };
  
  triggerFetch();
  
  const updateListener = () => {
    const localList = JSON.parse(localStorage.getItem(`reels_${collectionName}`) || '[]');
    let filtered = [...localList];
    constraints.forEach((c: any) => {
      if (c.type === 'where' && c.op === '==') {
        filtered = filtered.filter((item: any) => item[c.field] === c.val);
      }
    });
    
    onNext({
      empty: filtered.length === 0,
      forEach: (callback: any) => {
        filtered.forEach((docData: any) => {
          callback({
            id: docData.id,
            data: () => docData,
          });
        });
      },
      docChanges: () => []
    });
  };
  window.addEventListener('reels-data-updated', updateListener);
  
  const channel = supabase
    .channel(`public:${collectionName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: collectionName },
      async () => {
        await triggerFetch();
      }
    )
    .subscribe();
    
  return () => {
    window.removeEventListener('reels-data-updated', updateListener);
    supabase.removeChannel(channel);
  };
}

// --- Auth Bridge ---

export function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = session.user;
      const firebaseLikeUser = {
        uid: user.id,
        email: user.email,
        displayName: user.user_metadata?.full_name || user.user_metadata?.displayName || user.email?.split('@')[0],
        emailVerified: !!user.email_confirmed_at,
        isAnonymous: user.is_anonymous || false,
        providerData: []
      };
      
      const localUsers = JSON.parse(localStorage.getItem('reels_users') || '[]');
      let localUser = localUsers.find((u: any) => u.id === user.id);
      if (!localUser) {
        localUser = {
          id: user.id,
          username: user.email ? user.email.split('@')[0].replace(/\s+/g, '_') : `user_${user.id.slice(0, 6)}`,
          displayName: user.user_metadata?.full_name || 'Supabase User',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          bio: 'Connected via Supabase Auth ✨',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          isFollowing: false,
          coinsBalance: 1000,
          earnedGifts: {},
        };
        localUsers.push(localUser);
        localStorage.setItem('reels_users', JSON.stringify(localUsers));
      }
      localStorage.setItem('reels_current_user', JSON.stringify(localUser));
      localStorage.setItem('reels_auth_mode', 'firebase');
      
      callback(firebaseLikeUser);
    } else {
      callback(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

export async function signInWithEmailAndPassword(authInstance: any, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return {
    user: {
      uid: data.user.id,
      email: data.user.email,
      displayName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
    }
  };
}

export async function createUserWithEmailAndPassword(authInstance: any, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return {
    user: {
      uid: data.user.id,
      email: data.user.email,
      displayName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
    }
  };
}

export async function signInAnonymously(authInstance: any) {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return {
    user: {
      uid: data.user.id,
      email: null,
      displayName: 'Guest',
      isAnonymous: true,
    }
  };
}

export async function signOut(authInstance: any) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signInWithPopup(authInstance: any, providerInstance: any) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    }
  });
  if (error) throw error;
  return {
    user: {
      uid: 'google_user_' + Date.now(),
      email: 'user@gmail.com',
      displayName: 'Google User',
    }
  };
}

// --- Storage Bridge ---

export function ref(storageInstance: any, path: string) {
  return { path };
}

export async function uploadBytes(storageRef: any, blob: Blob) {
  const path = storageRef.path;
  const parts = path.split('/');
  const bucket = parts[0] || 'reels-assets';
  const fileName = parts.slice(1).join('/') || `file_${Date.now()}`;
  
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, blob, {
      cacheControl: '3600',
      upsert: true
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn(`Supabase storage fallback for ${path}`, err);
    throw err;
  }
}

export async function getDownloadURL(storageRef: any) {
  const path = storageRef.path;
  const parts = path.split('/');
  const bucket = parts[0] || 'reels-assets';
  const fileName = parts.slice(1).join('/');
  
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}
