/* Almacenamiento del MODO DEMO: todo vive en el navegador (localStorage) */
(function () {
  const A = window.Arch;
  const KEY = 'arch.demo.v1';
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

  class LocalStore {
    constructor() {
      this.demo = true;
      this.listeners = [];
    }
    async init() {
      this.d = A.ls.get(KEY, null) || A.demoSeed();
      this._save();
      this._user = A.ls.get('arch.demo.user', null);
    }
    _save() { A.ls.set(KEY, this.d); }
    resetDemo() {
      this.d = A.demoSeed();
      this._save();
    }

    /* ---- Sesión ---- */
    user() { return this._user ? clone(this._user) : null; }
    onAuth(fn) { this.listeners.push(fn); }
    _setUser(u) {
      this._user = u;
      A.ls.set('arch.demo.user', u);
      this.listeners.forEach((f) => f());
    }
    async signInAdmin() { this._setUser({ uid: 'demo-admin', name: this.d.settings.authorName, isAdmin: true, anon: false }); }
    async signInGoogle() { return this.signInAdmin(); }
    async signInReader(name) {
      const u = this._user && !this._user.isAdmin ? this._user : { uid: 'demo-' + A.uid(8), isAdmin: false, anon: true };
      if (name) u.name = name;
      this._setUser(u);
    }
    async signOut() { this._setUser(null); }

    /* ---- Ajustes ---- */
    async getSettings() { return Object.assign(A.defaultSettings(), clone(this.d.settings)); }
    async saveSettings(s) { this.d.settings = clone(s); this._save(); }

    /* ---- Obras ---- */
    async listWorks(admin) {
      return clone(Object.values(this.d.works).filter((w) => admin || A.isVisible(w.pubAt)));
    }
    async getWork(id, admin) {
      const w = this.d.works[id];
      if (!w || (!admin && !A.isVisible(w.pubAt))) return null;
      return clone(w);
    }
    async saveWork(w) {
      const id = w.id || A.uid(10);
      const prev = this.d.works[id] || { views: 0, createdAt: Date.now(), chapterMeta: [] };
      this.d.works[id] = Object.assign({}, prev, clone(w), { id, views: prev.views, updatedAt: Date.now() });
      if (!this.d.chapters[id]) this.d.chapters[id] = {};
      this._save();
      return id;
    }
    async deleteWork(id) {
      delete this.d.works[id];
      delete this.d.chapters[id];
      delete this.d.search[id];
      this.d.comments = this.d.comments.filter((c) => c.workId !== id);
      this.d.reactions = this.d.reactions.filter((r) => r.workId !== id);
      this._save();
    }
    async updateWorkMeta(id, patch) {
      if (!this.d.works[id]) return;
      Object.assign(this.d.works[id], clone(patch));
      this._save();
    }

    /* ---- Capítulos ---- */
    async listChapters(workId, admin) {
      const all = Object.values(this.d.chapters[workId] || {});
      return clone(all.filter((c) => admin || A.isVisible(c.pubAt)).sort((a, b) => a.order - b.order));
    }
    async getChapter(workId, id, admin) {
      const c = (this.d.chapters[workId] || {})[id];
      if (!c || (!admin && !A.isVisible(c.pubAt))) return null;
      return clone(c);
    }
    async saveChapter(workId, ch) {
      const id = ch.id || A.uid(8);
      const map = (this.d.chapters[workId] = this.d.chapters[workId] || {});
      const prev = map[id] || { views: 0 };
      map[id] = Object.assign({}, prev, clone(ch), { id, views: prev.views });
      this._save();
      return id;
    }
    async deleteChapter(workId, id) {
      delete (this.d.chapters[workId] || {})[id];
      this.d.comments = this.d.comments.filter((c) => c.chapter !== workId + '__' + id);
      this._save();
    }
    async addView(workId, chId) {
      const w = this.d.works[workId];
      const c = (this.d.chapters[workId] || {})[chId];
      if (w) w.views = (w.views || 0) + 1;
      if (c) c.views = (c.views || 0) + 1;
      this._save();
    }

    /* ---- Búsqueda en el texto ---- */
    async saveSearchText(workId, pubAt, text) { this.d.search[workId] = { pubAt, text }; this._save(); }
    async loadSearchTexts() {
      const out = {};
      for (const id in this.d.search) if (A.isVisible(this.d.search[id].pubAt)) out[id] = this.d.search[id].text;
      return out;
    }

    /* ---- Comentarios ---- */
    async listComments(chapterKey) {
      return clone(this.d.comments.filter((c) => c.chapter === chapterKey).sort((a, b) => a.createdAt - b.createdAt));
    }
    async addComment(c) {
      const u = this._user;
      if (!u) throw new Error('auth');
      if (this.d.blocked[u.uid]) throw new Error('blocked');
      const doc = Object.assign(clone(c), { id: A.uid(10), uid: u.uid, isAuthor: !!u.isAdmin, createdAt: Date.now() });
      this.d.comments.push(doc);
      this._save();
      return clone(doc);
    }
    async deleteComment(id) {
      /* Al borrar un comentario se borran también sus respuestas */
      const kill = new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const c of this.d.comments) if (c.parentId && kill.has(c.parentId) && !kill.has(c.id)) { kill.add(c.id); grew = true; }
      }
      this.d.comments = this.d.comments.filter((c) => !kill.has(c.id));
      this._save();
    }
    async listRecentComments(limit) {
      return clone([...this.d.comments].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit || 100));
    }
    async blockUser(uid, name) { this.d.blocked[uid] = { name: name || '', at: Date.now() }; this._save(); }
    async unblockUser(uid) { delete this.d.blocked[uid]; this._save(); }
    async listBlocked() { return Object.entries(this.d.blocked).map(([uid, v]) => ({ uid, ...v })); }

    /* ---- Reacciones ---- */
    async getReactions(key, emojis) {
      const mine = new Set();
      const counts = {};
      emojis.forEach((e) => (counts[A.emojiCode(e)] = 0));
      for (const r of this.d.reactions) {
        if (r.key !== key) continue;
        if (counts[r.code] != null) counts[r.code]++;
        if (this._user && r.uid === this._user.uid) mine.add(r.code);
      }
      return { counts, mine };
    }
    async toggleReaction(key, workId, emoji, on) {
      const u = this._user;
      if (!u) throw new Error('auth');
      if (this.d.blocked[u.uid]) throw new Error('blocked');
      const code = A.emojiCode(emoji);
      this.d.reactions = this.d.reactions.filter((r) => !(r.key === key && r.uid === u.uid && r.code === code));
      if (on) this.d.reactions.push({ id: A.uid(8), key, workId, uid: u.uid, code, emoji });
      this._save();
    }

    /* ---- Estadísticas ---- */
    async workCounts(workId) {
      return {
        comments: this.d.comments.filter((c) => c.workId === workId).length,
        reactions: this.d.reactions.filter((r) => r.workId === workId).length,
      };
    }
  }

  A.LocalStore = LocalStore;
})();
