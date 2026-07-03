// Firebase-compatible adapter for local backend
const BACKEND_URL = 'http://10.131.173.110:3001';

class Auth {
  currentUser = null;
  onAuthStateChangedCallback = null;

  async createUserWithEmailAndPassword(email, password) {
    const signupData = {
      name: document.getElementById('name')?.value || 'User',
      email: email,
      phone: document.getElementById('phone')?.value || '',
      password: password,
      role: document.getElementById('role')?.value || 'customer'
    };

    const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData)
    });

    if (!response.ok) {
      const data = await response.json();
      const error = new Error(data.error);
      error.code = 'auth/signup-failed';
      throw error;
    }

    const data = await response.json();
    this.currentUser = { uid: data.user.id, email: data.user.email };
    
    // Store profile locally
    const fullProfile = {
      id: data.user.id,
      name: signupData.name,
      email: signupData.email,
      phone: signupData.phone,
      role: signupData.role
    };
    localStorage.setItem(`zenmeat_profile_${data.user.id}`, JSON.stringify(fullProfile));
    
    if (this.onAuthStateChangedCallback) this.onAuthStateChangedCallback(this.currentUser);
    return { user: this.currentUser };
  }

  async signInWithEmailAndPassword(email, password) {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const data = await response.json();
      const error = new Error(data.error);
      error.code = 'auth/login-failed';
      throw error;
    }

    const data = await response.json();
    this.currentUser = { uid: data.user.id, email: data.user.email };
    
    // Store profile locally
    const fullProfile = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role
    };
    localStorage.setItem(`zenmeat_profile_${data.user.id}`, JSON.stringify(fullProfile));
    
    if (this.onAuthStateChangedCallback) this.onAuthStateChangedCallback(this.currentUser);
    return { user: this.currentUser };
  }

  async signOut() {
    this.currentUser = null;
    if (this.onAuthStateChangedCallback) this.onAuthStateChangedCallback(null);
  }

  onAuthStateChanged(callback) {
    this.onAuthStateChangedCallback = callback;
    callback(this.currentUser);
  }
}

class Firestore {
  collection(name) {
    return new Collection(name);
  }

  FieldValue = {
    serverTimestamp: () => new Date().toISOString()
  };
}

class Collection {
  constructor(name) {
    this.name = name;
  }

  doc(id) {
    return new Doc(this.name, id);
  }

  add(data) {
    return fetch(`${BACKEND_URL}/api/${this.name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()).then(result => ({
      id: result.item?.id || result.order?.id || Date.now().toString()
    }));
  }

  where(field, op, value) {
    return new Query(this.name, field, op, value);
  }

  orderBy(field, direction) {
    return new OrderByQuery(this.name, field, direction);
  }
}

class Doc {
  constructor(collection, id) {
    this.collection = collection;
    this.id = id;
  }

  async set(data) {
    // For profiles collection, just store locally
    if (this.collection === 'profiles') {
      const profileData = { ...data, id: this.id };
      localStorage.setItem(`zenmeat_profile_${this.id}`, JSON.stringify(profileData));
      return { success: true };
    }

    // For other collections, POST to backend
    const response = await fetch(`${BACKEND_URL}/api/${this.collection}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, vendorId: this.id })
    });
    return response.json();
  }

  async get() {
    // Try to get from localStorage first
    const localProfile = localStorage.getItem(`zenmeat_profile_${this.id}`);
    if (localProfile) {
      return {
        exists: true,
        data: () => JSON.parse(localProfile),
        id: this.id
      };
    }

    // Fallback: try to fetch from backend
    try {
      const response = await fetch(`${BACKEND_URL}/api/${this.collection}?userId=${this.id}`);
      const allDocs = await response.json();
      const doc = allDocs.find(d => d.id === this.id) || allDocs[0];
      if (doc) {
        localStorage.setItem(`zenmeat_profile_${this.id}`, JSON.stringify(doc));
      }
      return {
        exists: !!doc,
        data: () => doc || {},
        id: this.id
      };
    } catch (err) {
      return {
        exists: false,
        data: () => ({}),
        id: this.id
      };
    }
  }

  async update(data) {
    const response = await fetch(`${BACKEND_URL}/api/${this.collection}/${this.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
}

class Query {
  constructor(collection, field, op, value) {
    this.collection = collection;
    this.field = field;
    this.op = op;
    this.value = value;
  }

  onSnapshot(callback, errorCallback) {
    fetch(`${BACKEND_URL}/api/${this.collection}?${this.field}=${this.value}`)
      .then(res => res.json())
      .then(docs => {
        const snapshot = {
          empty: docs.length === 0,
          docs: docs.map(doc => ({
            id: doc.id,
            data: () => doc
          })),
          forEach: function(fn) {
            this.docs.forEach(doc => fn(doc));
          }
        };
        callback(snapshot);
      })
      .catch(err => {
        if (errorCallback) errorCallback(err);
      });

    return () => {}; // unsubscribe function
  }
}

class OrderByQuery {
  constructor(collection, field, direction) {
    this.collection = collection;
    this.field = field;
    this.direction = direction;
  }

  onSnapshot(callback, errorCallback) {
    fetch(`${BACKEND_URL}/api/${this.collection}`)
      .then(res => res.json())
      .then(docs => {
        const sorted = docs.sort((a, b) => {
          const aVal = a[this.field] || 0;
          const bVal = b[this.field] || 0;
          return this.direction === 'desc' ? bVal - aVal : aVal - bVal;
        });

        const snapshot = {
          empty: sorted.length === 0,
          docs: sorted.map(doc => ({
            id: doc.id,
            data: () => doc
          })),
          forEach: function(fn) {
            this.docs.forEach(doc => fn(doc));
          }
        };
        callback(snapshot);
      })
      .catch(err => {
        if (errorCallback) errorCallback(err);
      });

    return () => {}; // unsubscribe function
  }
}

// Export compatible Firebase object
window.firebase = {
  auth: () => new Auth(),
  firestore: () => new Firestore(),
  apps: [{}],
  initializeApp: () => ({ auth: () => new Auth() }),
  FieldValue: {
    serverTimestamp: () => new Date().toISOString()
  }
};

// Make firestore available as both function and property
window.firebase.firestore.FieldValue = {
  serverTimestamp: () => new Date().toISOString()
};

// Override global firebase references
if (typeof auth === 'undefined') {
  window.auth = new Auth();
}
if (typeof db === 'undefined') {
  window.db = new Firestore();
}
