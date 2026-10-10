/* Almacenamiento REAL con Firebase (plan gratuito Spark): Firestore + Authentication */
(function () {
  const A = window.Arch;
  const TS_FIELDS = ['pubAt', 'createdAt', 'updatedAt', 'at'];

  class FirebaseStore {
    constructor() {
      this.demo = false;
      this.listeners = [];
      this._user = null;
    }

    async init(cfg) {
      const base = `https://www.gstatic.com/firebasejs/${cfg.firebaseVersion || '12.19.0'}/`;
      const [appM, fs, au] = await Promise.all([
        import(base + 'firebase-app.js'),
        import(base + 'firebase-firestore.js'),
        import(base + 'firebase-auth.js'),
      ]);
      this.fs = fs;
      this.au = au;
      this.adminUid = cfg.adminUid || '';
      this.app = appM.initializeApp(cfg.firebase);
      this.db = fs.getFirestore(this.app);
      this.auth = au.getAuth(this.app);
      await new Promise((res) => {
        let first = true;
        au.onAuthStateChanged(this.auth, (u) => {
          this._user = u;
          if (first) { first = false; res(); } else this.listeners.forEach((f) => f());
        });
      });
    }

    /* ---- Conversión de fechas: milisegundos <-> Timestamp ---- */
    _in(data) {
      if (!data) return data;
      const o = { ...data };
      for (const k of TS_FIELDS) if (o[k] && typeof o[k].toMillis === 'function') o[k] = o[k].toMillis();
      return o;
    }
    _out(data) {
      const o = { ...data };
      for (const k of TS_FIELDS) if (k in o) o[k] = o[k] == null ? null : this.fs.Timestamp.fromMillis(o[k]);
      return o;
    }
    _doc(...p) { return this.fs.doc(this.db, ...p); }
    _col(...p) { return this.fs.collection(this.db, ...p); }
    _snapList(snap) { return snap.docs.map((d) => this._in({ id: d.id, ...d.data() })); }
    /* Tolerancia de reloj: las reglas aceptan hasta 10 minutos de diferencia */
    _now() { return this.fs.Timestamp.fromMillis(Date.now()); }

    /* ---- Sesión ---- */
    user() {
      const u = this._user;
      if (!u) return null;
      return {
        uid: u.uid,
        isAdmin: !!this.adminUid && u.uid === this.adminUid,
        anon: u.isAnonymous,
        name: A.ls.get('arch.readerName', '') || u.displayName || '',
      };
    }
    onAuth(fn) { this.listeners.push(fn); }
    async signInAdmin() {
      const p = new this.au.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      await this.au.signInWithPopup(this.auth, p);
    }
    async signInGoogle() { return this.signInAdmin(); }
    async signInReader(name) {
      if (name) A.ls.set('arch.readerName', name);
      if (!this._user) await this.au.signInAnonymously(this.auth);
      this.listeners.forEach((f) => f());
    }
    async signOut() { await this.au.signOut(this.auth); }

    /* ---- Ajustes ---- */
    async getSettings() {
      const s = await this.fs.getDoc(this._doc('settings', 'site'));
      return Object.assign(A.defaultSettings(), s.exists() ? s.data() : {});
    }
    async saveSettings(s) { await this.fs.setDoc(this._doc('settings', 'site'), s); }

    /* ---- Obras ---- */
    async listWorks(admin) {
      const { query, where, getDocs } = this.fs;
      const q = admin ? this._col('works') : query(this._col('works'), where('pubAt', '<=', this._now()));
      return this._snapList(await getDocs(q));
    }
    async getWork(id) {
      try {
        const s = await this.fs.getDoc(this._doc('works', id));
        return s.exists() ? this._in({ id: s.id, ...s.data() }) : null;
      } catch (e) {
        return null; /* sin permiso = no publicada */
      }
    }
    async saveWork(w) {
      const isNew = !w.id;
      const id = w.id || A.uid(10);
      const data = { ...w };
      delete data.id;
      delete data.views;
      data.updatedAt = Date.now();
      if (isNew) { data.views = 0; data.createdAt = Date.now(); data.chapterMeta = []; }
      await this.fs.setDoc(this._doc('works', id), this._out(data), { merge: true });
      return id;
    }
    async updateWorkMeta(id, patch) {
      await this.fs.setDoc(this._doc('works', id), this._out(patch), { merge: true });
    }
    async deleteWork(id) {
      const { getDocs, query, where, deleteDoc, writeBatch } = this.fs;
      const chs = await getDocs(this._col('works', id, 'chapters'));
      for (const c of chs.docs) await deleteDoc(c.ref);
      for (const colName of ['comments', 'reactions']) {
        const snap = await getDocs(query(this._col(colName), where('workId', '==', id)));
        let batch = writeBatch(this.db), n = 0;
        for (const d of snap.docs) {
          batch.delete(d.ref);
          if (++n % 400 === 0) { await batch.commit(); batch = writeBatch(this.db); }
        }
        await batch.commit();
      }
      await deleteDoc(this._doc('search', id));
      await deleteDoc(this._doc('works', id));
    }

    /* ---- Capítulos ---- */
    async listChapters(workId, admin) {
      const { query, where, getDocs } = this.fs;
      const col = this._col('works', workId, 'chapters');
      try {
        const q = admin ? col : query(col, where('pubAt', '<=', this._now()));
        return this._snapList(await getDocs(q)).sort((a, b) => a.order - b.order);
      } catch (e) {
        return [];
      }
    }
    async getChapter(workId, id) {
      try {
        const s = await this.fs.getDoc(this._doc('works', workId, 'chapters', id));
        return s.exists() ? this._in({ id: s.id, ...s.data() }) : null;
      } catch (e) {
        return null;
      }
    }
    async saveChapter(workId, ch) {
      const isNew = !ch.id;
      const id = ch.id || A.uid(8);
      const data = { ...ch };
      delete data.id;
      delete data.views;
      if (isNew) data.views = 0;
      await this.fs.setDoc(this._doc('works', workId, 'chapters', id), this._out(data), { merge: true });
      return id;
    }
    async deleteChapter(workId, id) {
      const { getDocs, query, where, deleteDoc } = this.fs;
      const snap = await getDocs(query(this._col('comments'), where('chapter', '==', workId + '__' + id)));
      for (const d of snap.docs) await deleteDoc(d.ref);
      await deleteDoc(this._doc('works', workId, 'chapters', id));
    }
    async addView(workId, chId) {
      const inc = this.fs.increment(1);
      try {
        await this.fs.updateDoc(this._doc('works', workId), { views: inc });
        await this.fs.updateDoc(this._doc('works', workId, 'chapters', chId), { views: inc });
      } catch (e) { /* si falla una visita no pasa nada */ }
    }

    /* ---- Búsqueda en el texto ---- */
    async saveSearchText(workId, pubAt, text) {
      await this.fs.setDoc(this._doc('search', workId), this._out({ pubAt, text }));
    }
    async loadSearchTexts() {
      const { query, where, getDocs } = this.fs;
      const snap = await getDocs(query(this._col('search'), where('pubAt', '<=', this._now())));
      const out = {};
      snap.docs.forEach((d) => (out[d.id] = d.data().text || ''));
      return out;
    }

    /* ---- Comentarios ---- */
    async listComments(chapterKey) {
      const { query, where, getDocs } = this.fs;
      const list = this._snapList(await getDocs(query(this._col('comments'), where('chapter', '==', chapterKey))));
      return list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }
    async addComment(c) {
      const u = this.user();
      if (!u) throw new Error('auth');
      const data = {
        chapter: c.chapter, workId: c.workId, pid: c.pid || null, parentId: c.parentId || null,
        text: c.text, name: c.name, uid: u.uid, isAuthor: !!u.isAdmin,
        createdAt: this.fs.serverTimestamp(),
      };
      try {
        const ref = await this.fs.addDoc(this._col('comments'), data);
        return { ...data, id: ref.id, createdAt: Date.now() };
      } catch (e) {
        if (String(e.code).includes('permission')) throw new Error('blocked');
        throw e;
      }
    }
    async deleteComment(id) {
      const { getDocs, query, where, deleteDoc } = this.fs;
      const kids = await getDocs(query(this._col('comments'), where('parentId', '==', id)));
      for (const k of kids.docs) await this.deleteComment(k.id);
      await deleteDoc(this._doc('comments', id));
    }
    async listRecentComments(n) {
      const { query, orderBy, limit, getDocs } = this.fs;
      return this._snapList(await getDocs(query(this._col('comments'), orderBy('createdAt', 'desc'), limit(n || 100))));
    }
    async blockUser(uid, name) { await this.fs.setDoc(this._doc('blocked', uid), { name: name || '', at: this.fs.serverTimestamp() }); }
    async unblockUser(uid) { await this.fs.deleteDoc(this._doc('blocked', uid)); }
    async listBlocked() { return this._snapList(await this.fs.getDocs(this._col('blocked'))).map((b) => ({ uid: b.id, ...b })); }

    /* ---- Reacciones ---- */
    async getReactions(key, emojis) {
      const { query, where, getCountFromServer, getDocs } = this.fs;
      const counts = {};
      const col = this._col('reactions');
      await Promise.all(
        emojis.map(async (e) => {
          const code = A.emojiCode(e);
          try {
            const s = await getCountFromServer(query(col, where('key', '==', key), where('code', '==', code)));
            counts[code] = s.data().count;
          } catch (err) { counts[code] = 0; }
        })
      );
      const mine = new Set();
      const u = this.user();
      if (u) {
        try {
          const snap = await getDocs(query(col, where('key', '==', key), where('uid', '==', u.uid)));
          snap.docs.forEach((d) => mine.add(d.data().code));
        } catch (err) {}
      }
      return { counts, mine };
    }
    async toggleReaction(key, workId, emoji, on) {
      const u = this.user();
      if (!u) throw new Error('auth');
      const code = A.emojiCode(emoji);
      const ref = this._doc('reactions', `${key}_${u.uid}_${code}`);
      try {
        if (on) await this.fs.setDoc(ref, { key, workId, uid: u.uid, code, emoji });
        else await this.fs.deleteDoc(ref);
      } catch (e) {
        if (String(e.code).includes('permission')) throw new Error('blocked');
        throw e;
      }
    }

    /* ---- Estadísticas ---- */
    async workCounts(workId) {
      const { query, where, getCountFromServer } = this.fs;
      const c = await getCountFromServer(query(this._col('comments'), where('workId', '==', workId)));
      const r = await getCountFromServer(query(this._col('reactions'), where('workId', '==', workId)));
      return { comments: c.data().count, reactions: r.data().count };
    }
  }

  A.FirebaseStore = FirebaseStore;
})();
