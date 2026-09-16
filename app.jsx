// app.jsx — root App, screen routing, transitions

const { useState: $S, useRef: $R, useEffect: $E, useMemo: $M } = React;

// The card style used to be one of three, switchable from a designer's
// panel that shipped with the app. There is one now, and it is this one.
const CARD_VARIANT = 'block';

function App() {

  const [recipes, setRecipes] = $S([]);
  const [recipesLoaded, setRecipesLoaded] = $S(false);
  const [categories, setCategories] = $S(() => {
    try { const s = localStorage.getItem('maites.cats'); return s ? JSON.parse(s) : CATEGORIES; }
    catch { return CATEGORIES; }
  });
  const [tab, setTab] = $S('home');
  // Category filter — array of ids; empty means "all"
  const [catFilter, setCatFilter] = $S([]);
  const toggleCatFilter = (id) =>
    setCatFilter(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  const [showAddCategory, setShowAddCategory] = $S(false);
  const [openRecipeId, setOpenRecipeId] = $S(null);
  const [cookRecipeId, setCookRecipeId] = $S(null);
  const [cookServings, setCookServings] = $S(0);
  const [editingRecipeId, setEditingRecipeId] = $S(null);
  const [deletingRecipeId, setDeletingRecipeId] = $S(null);
  const [toast, setToast] = $S(null);
  const [density, setDensity] = $S(() => {
    // Two layouts: stacked cards, or a grid of tiles. 'compact' was a
    // third, in between, and anyone still on it lands on the cards.
    try { return localStorage.getItem('maites.density') === 'grid' ? 'grid' : 'comfy'; }
    catch { return 'comfy'; }
  });
  const [showNavGuard, setShowNavGuard] = $S(false);
  const [pendingNav, setPendingNav] = $S(null);
  const formDirtyRef = $R(false);
  const [showManageCategories, setShowManageCategories] = $S(false);
  const [currentUser, setCurrentUser] = $S(null);
  const [authLoading, setAuthLoading] = $S(true);
  const [showClaimPrompt, setShowClaimPrompt] = $S(false);
  const [claiming, setClaiming] = $S(false);
  const [showAccountPanel, setShowAccountPanel] = $S(false);
  // Which of the recipe form's four passes is showing. It lives here so
  // the phone's back gesture walks back through them one at a time.
  const [formStep, setFormStep] = $S(0);
  const [sharesInfo, setSharesInfo] = $S({ asOwner: [], asGuest: [] });
  const [pendingInvites, setPendingInvites] = $S([]);
  const [sharedOwnerUids, setSharedOwnerUids] = $S([]);
  const [sharedWithMe, setSharedWithMe] = $S([]);
  const [sharingRecipe, setSharingRecipe] = $S(null);
  // Recipe book tab
  const [bookRecipeId, setBookRecipeId] = $S(null);
  const [showPrintSheet, setShowPrintSheet] = $S(false);
  const [printJob, setPrintJob] = $S(null);   // array of recipes being exported
  const [loadError, setLoadError] = $S(null);
  const [online, setOnline] = $S(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [syncMeta, setSyncMeta] = $S({ fromCache: false, hasPendingWrites: false });
  const recipesUnsubRef = $R(null);
  const [themeMode, setThemeMode] = useTheme();
  const saveState = useSaveState();
  const retryLastSave = $R(null);

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = $S(null);
  const [showInstall, setShowInstall] = $S(false);

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !isStandalone;
  const installDismissed = () => { try { return localStorage.getItem('maites.install.dismissed') === '1'; } catch { return false; } };

  $E(() => {
    if (isStandalone || installDismissed()) return;
    // Pick up event captured before React loaded
    if (window.__deferredInstall) {
      setInstallPrompt(window.__deferredInstall);
      setTimeout(() => setShowInstall(true), 1500);
    }
    // Also listen for future events
    const handler = (e) => { e.preventDefault(); window.__deferredInstall = e; setInstallPrompt(e); setShowInstall(true); };
    window.addEventListener('beforeinstallprompt', handler);
    // iOS: always show instructions (can't use beforeinstallprompt)
    if (isIOS) setTimeout(() => setShowInstall(true), 1500);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const [hintSeen, setHintSeen] = $S(() => {
    try { return localStorage.getItem('receips.hint') === '1'; }
    catch { return false; }
  });
  $E(() => {
    if (hintSeen) return;
    const timer = setTimeout(() => {
      setHintSeen(true);
      try { localStorage.setItem('receips.hint', '1'); } catch {}
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  const openRecipe     = recipes.find(r => r.id === openRecipeId)     || null;
  // Steps can be opened from a shared recipe too, which never lives in `recipes`.
  const cookRecipe     = recipes.find(r => r.id === cookRecipeId)
                      || sharedWithMe.find(r => r.id === cookRecipeId)
                      || null;
  const editingRecipe  = recipes.find(r => r.id === editingRecipeId)  || null;
  const deletingRecipe = recipes.find(r => r.id === deletingRecipeId) || null;

  const loadUserData = async (user) => {
    setRecipesLoaded(false);
    setLoadError(null);
    try {
      // Accept any pending share invites for this user
      const accepted = await db_checkAndAcceptInvites(user.uid, user.email);
      if (accepted.length > 0) {
        const names = accepted.map(a => a.ownerDisplayName || a.ownerEmail).join(', ');
        setTimeout(() => showToast(`${names} שיתפ/ה איתך מתכונים! 🎉`), 800);
      }
      // Load share relationships
      const shares = await db_getMyShares(user.uid);
      setSharesInfo(shares);
      const ownerUids = shares.asGuest.map(s => s.ownerUid);
      setSharedOwnerUids(ownerUids);
      // Load pending invites sent by this user
      const myInvites = await db_getMyInvites(user.uid);
      setPendingInvites(myInvites);
      // Load recipes shared with me individually
      const shared = await db_getSharedWithMe(user.email);
      setSharedWithMe(shared);
      // Photos: re-read the store now that we are definitely signed in, in
      // case the first read happened before the session was known.
      if (typeof db_refreshImageSlots === 'function') {
        db_refreshImageSlots().catch(err => reportError('refresh-images', err));
      }
      // Live recipes (own + shared accounts). Emits from the local cache
      // first, so the list is on screen with no connection at all.
      if (recipesUnsubRef.current) recipesUnsubRef.current();
      recipesUnsubRef.current = db_watchRecipes(user.uid, ownerUids,
        (recs, meta) => {
          setRecipes(recs || []);
          setSyncMeta({ fromCache: !!meta.fromCache, hasPendingWrites: !!meta.hasPendingWrites });
          setRecipesLoaded(true);
          setLoadError(null);
        },
        (err) => { reportError('watch-recipes', err); setLoadError(err); setRecipesLoaded(true); });
      // Claim prompt (one-time migration)
      const claimedKey = `maites.claimed.${user.uid}`;
      if (!localStorage.getItem(claimedKey)) {
        const has = await db_hasUnownedRecipes();
        if (has) setShowClaimPrompt(true);
        else localStorage.setItem(claimedKey, '1');
      }
    } catch (err) {
      reportError('load-recipes', err);
      setLoadError(err);
      setRecipesLoaded(true);
    }
    db_loadCategories().then(cats => {
      if (cats && cats.length > 0) {
        setCategories(cats);
        try { localStorage.setItem('maites.cats', JSON.stringify(cats)); } catch {}
      }
    }).catch(() => { /* offline with a cold cache — the localStorage copy stands */ });
  };

  // Connection state — drives the offline banner and the sync copy.
  $E(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  $E(() => () => { if (recipesUnsubRef.current) recipesUnsubRef.current(); }, []);

  // Auth state listener
  $E(() => {
    if (typeof auth_onAuthStateChanged === 'undefined') {
      setAuthLoading(false);
      return;
    }
    const unsub = auth_onAuthStateChanged(user => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) loadUserData(user);
    });
    // Never spin forever: with no connection and no stored session the
    // sign-in screen is the honest answer.
    const bail = setTimeout(() => setAuthLoading(false), 6000);
    return () => { clearTimeout(bail); unsub(); };
  }, []);

  const addCategory = (cat) => {
    const next = [...categories, cat];
    setCategories(next);
    try { localStorage.setItem('maites.cats', JSON.stringify(next)); } catch {}
    if (typeof db_saveCategories !== 'undefined') db_saveCategories(next).catch(err => reportError('save-categories', err));
  };

  const editCategory = (id, updates) => {
    const next = categories.map(c => c.id === id ? { ...c, ...updates } : c);
    setCategories(next);
    try { localStorage.setItem('maites.cats', JSON.stringify(next)); } catch {}
    if (typeof db_saveCategories !== 'undefined') db_saveCategories(next).catch(err => reportError('save-categories', err));
  };

  const deleteCategory = (id) => {
    const next = categories.filter(c => c.id !== id);
    setCategories(next);
    try { localStorage.setItem('maites.cats', JSON.stringify(next)); } catch {}
    if (typeof db_saveCategories !== 'undefined') db_saveCategories(next).catch(err => reportError('save-categories', err));
  };

  // Auto-create a category if it doesn't exist yet.
  // Uses CATEGORY_SEED first, then catInfo from the recipe, then a bare minimum fallback.
  const ensureCategoryExists = (catId, currentCats, catInfo) => {
    if (!catId || catId === 'all') return;
    if (currentCats.some(c => c.id === catId)) return;
    const seed = typeof CATEGORY_SEED !== 'undefined' && CATEGORY_SEED[catId];
    if (seed) { addCategory(seed); return; }
    if (catInfo) { addCategory({ id: catId, label: catInfo.label, emoji: catInfo.emoji || '🍽️' }); }
  };

  const toggleFav = (id) =>
    setRecipes(rs => {
      const updated = rs.map(r => r.id === id ? { ...r, favorite: !r.favorite } : r);
      const changed = updated.find(r => r.id === id);
      if (changed && typeof db_saveRecipe !== 'undefined') db_saveRecipe(changed).catch(err => reportError('save-recipe', err));
      return updated;
    });

  const addRecipe = (rec) => {
    ensureCategoryExists(rec.category, categories, rec._catInfo);
    setRecipes(rs => [rec, ...rs]);
    if (typeof db_saveRecipe !== 'undefined') {
      retryLastSave.current = () => db_saveRecipe(rec);
      db_saveRecipe(rec).catch(err => reportError('save-recipe', err));
    }
    setTab('home');
    showToast(`"${rec.title}" נוסף לאוסף 🎉`);
  };

  const updateRecipe = (rec) => {
    setRecipes(rs => rs.map(r => r.id === rec.id ? { ...r, ...rec } : r));
    if (typeof db_saveRecipe !== 'undefined') {
      retryLastSave.current = () => db_saveRecipe(rec);
      db_saveRecipe(rec).catch(err => reportError('save-recipe', err));
    }
    setEditingRecipeId(null);
    showToast(`עודכן: "${rec.title}"`);
  };

  const updateNotes = (id, notes) =>
    setRecipes(rs => {
      const updated = rs.map(r => r.id === id ? { ...r, notes } : r);
      const changed = updated.find(r => r.id === id);
      if (changed && typeof db_saveRecipe !== 'undefined') db_saveRecipe(changed).catch(err => reportError('save-recipe', err));
      return updated;
    });

  const deleteRecipe = (id) => {
    setRecipes(rs => rs.filter(r => r.id !== id));
    if (typeof db_deleteRecipe !== 'undefined') db_deleteRecipe(id).catch(err => reportError('delete-recipe', err));
    setOpenRecipeId(null);
    setDeletingRecipeId(null);
    showToast('המתכון נמחק');
  };

  const toastTimer = $R(0);
  const showToast = (msg, tone = 'neutral') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), tone === 'danger' ? 4000 : 2400);
  };

  const handleExport = (kind) => {
    if (kind === 'excel') {
      exportExcel(recipes);
      showToast('הקובץ הורד · ניתן לפתוח ב-Excel');
    } else if (kind === 'word') {
      exportWord(recipes);
      showToast('המסמך הורד · ניתן לפתוח בוורד');
    }
  };

  const handleImport = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    importFromFile(f, (err, recs) => {
      if (err) { reportError('import-file', err); showToast(err.message || 'שגיאה בקריאת הקובץ', 'danger'); return; }
      if (!recs?.length) { showToast('לא נמצאו מתכונים בקובץ'); return; }

      // Auto-create categories for incoming recipes (uses current categories state)
      recs.forEach(r => ensureCategoryExists(r.category, categories, r._catInfo));

      // Deduplicate by title (case-insensitive)
      setRecipes(existing => {
        const existingTitles = new Set(existing.map(r => r.title.trim().toLowerCase()));
        const newRecs = recs.filter(r => !existingTitles.has(r.title.trim().toLowerCase()));
        const dupCount = recs.length - newRecs.length;

        if (newRecs.length > 0 && typeof db_saveRecipe !== 'undefined') {
          newRecs.forEach(r => db_saveRecipe(r).catch(err => reportError('import-save', err)));
        }

        const msg = newRecs.length === 0
          ? `כל המתכונים כבר קיימים (${dupCount} כפולים דולגו)`
          : `${newRecs.length} מתכונים יובאו${dupCount ? ` · ${dupCount} כפולים דולגו` : ''}`;
        setTimeout(() => showToast(msg), 0);

        return newRecs.length ? [...newRecs, ...existing] : existing;
      });
      setTab('home');
    });
    e.target.value = '';
  };

  const TABS = ['home', 'book', 'favorites', 'add'];
  const goTab = (id) => {
    setTab(TABS.includes(id) ? id : 'home');
    if (id !== 'book') setBookRecipeId(null);
  };
  const navTo = (id) => {
    if (tab === 'add' && id !== 'add' && formDirtyRef.current) {
      setPendingNav(id);
      setShowNavGuard(true);
      return;
    }
    formDirtyRef.current = false;
    goTab(id);
  };
  const confirmNavLeave = () => {
    const id = pendingNav;
    setShowNavGuard(false); setPendingNav(null); formDirtyRef.current = false;
    goTab(id);
  };

  // ── Back-gesture support ─────────────────────────────────
  // Every overlay / non-home tab is mirrored as a browser history entry, so
  // the Android back gesture (and the hardware back button) pops one layer
  // instead of closing the app.
  const layers = [];
  if (tab !== 'home')      layers.push('tab');
  if (openRecipeId)        layers.push('recipe');
  if (bookRecipeId)        layers.push('bookpage');
  if (editingRecipeId)     layers.push('edit');
  const formOpen = tab === 'add' || !!editingRecipeId;
  if (formOpen) for (let i = 0; i < formStep; i++) layers.push('formstep');
  if (cookRecipe)          layers.push('cook');
  if (sharingRecipe)       layers.push('share');
  if (showAccountPanel)    layers.push('account');
  if (showManageCategories)layers.push('managecats');
  if (showAddCategory)     layers.push('addcat');
  if (showPrintSheet)      layers.push('printsheet');
  if (deletingRecipeId)    layers.push('delete');
  if (showNavGuard)        layers.push('navguard');

  const layersRef = $R(layers);
  layersRef.current = layers;
  const pushedRef = $R(0);
  const ignorePopRef = $R(0);

  const closeTopLayer = () => {
    const ls = layersRef.current;
    const top = ls[ls.length - 1];
    switch (top) {
      case 'navguard':   setShowNavGuard(false); setPendingNav(null); break;
      case 'delete':     setDeletingRecipeId(null); break;
      case 'printsheet': setShowPrintSheet(false); break;
      case 'addcat':     setShowAddCategory(false); break;
      case 'managecats': setShowManageCategories(false); break;
      case 'account':    setShowAccountPanel(false); break;
      case 'share':      setSharingRecipe(null); break;
      case 'cook':       setCookRecipeId(null); break;
      case 'formstep':   setFormStep(n => Math.max(0, n - 1)); break;
      case 'edit':       setEditingRecipeId(null); break;
      case 'bookpage':   setBookRecipeId(null); break;
      case 'recipe':     setOpenRecipeId(null); break;
      case 'tab':        navTo('home'); break;
      default: break;
    }
  };

  $E(() => {
    try { history.replaceState({ maites: 0 }, ''); } catch {}
    const onPop = () => {
      // Entries we popped ourselves (when a layer was closed from the UI).
      if (ignorePopRef.current > 0) { ignorePopRef.current--; return; }
      if (layersRef.current.length === 0) return;  // at root → let the app close
      pushedRef.current = Math.max(0, pushedRef.current - 1);
      closeTopLayer();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const layerKey = layers.join('|');
  $E(() => {
    const next = layers.length;
    const prev = pushedRef.current;
    if (next > prev) {
      for (let i = prev; i < next; i++) {
        try { history.pushState({ maites: i + 1 }, ''); } catch {}
      }
      pushedRef.current = next;
    } else if (next < prev) {
      const diff = prev - next;
      pushedRef.current = next;
      ignorePopRef.current += diff;
      try { history.go(-diff); } catch { ignorePopRef.current -= diff; }
    }
  }, [layerKey]);

  $E(() => { if (!formOpen) setFormStep(0); }, [formOpen]);

  const openMs = 380;
  // Writing a recipe down takes over the screen: the tab bar would sit on
  // top of the form's own controls, and leaving mid-sentence by tapping a
  // tab is not something anyone means to do. You leave with ביטול.
  const anyOverlay = !!(openRecipe || cookRecipe || editingRecipe || tab === 'add');

  const handleClaimRecipes = async () => {
    if (!currentUser) return;
    setClaiming(true);
    try {
      const count = await db_claimUnownedRecipes(currentUser.uid);
      localStorage.setItem(`maites.claimed.${currentUser.uid}`, '1');
      setShowClaimPrompt(false);
      if (count > 0) showToast(`${count} מתכונים שויכו לחשבון שלך ✓`);
    } catch (e) {
      reportError('claim-recipes', e);
      showToast('שגיאה בשיוך המתכונים', 'danger');
    } finally {
      setClaiming(false);
    }
  };

  // Auth loading spinner
  if (authLoading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
        background: 'var(--bg)', fontFamily: 'var(--font-display)',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>
          <img src="/maites-logo.png" alt="Maites" style={{ width: 100, height: 100, objectFit: 'contain', marginBottom: 16 }}/>
          <div style={{ fontSize: 'var(--t-body)' }}>טוענת…</div>
        </div>
      </div>
    );
  }

  // Not signed in → show login screen
  if (!currentUser) {
    return <LoginScreen onSignIn={auth_signInWithGoogle} />;
  }

  return (
    <AnimSpeedContext.Provider value="normal">
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>

        {/* Main tab screens */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {tab === 'home' && (
            <HomeScreen
              recipes={recipes}
              recipesLoaded={recipesLoaded}
              loadError={loadError}
              onRetryLoad={() => currentUser && loadUserData(currentUser)}
              onOpen={r => setOpenRecipeId(r.id)}
              onToggleFav={toggleFav}
              density={density}
              onDensity={(d) => { setDensity(d); try { localStorage.setItem('maites.density', d); } catch {} }}
              variant={CARD_VARIANT}
              category={catFilter}
              onCategory={toggleCatFilter}
              onClearCategory={() => setCatFilter([])}
              sharedKey={density}
              categories={categories}
              onAddCategory={() => setShowAddCategory(true)}
              onManageCategories={() => setShowManageCategories(true)}
              currentUser={currentUser}
              onOpenAccount={() => setShowAccountPanel(true)}
              sharedWithMe={sharedWithMe}
              onOpenShared={r => setOpenRecipeId(r._shareId ? r._shareId + '__shared' : r.id)}
              onRemoveShared={async (shareId) => {
                await db_removeSharedRecipe(shareId).catch(err => reportError('remove-share', err));
                setSharedWithMe(s => s.filter(r => r._shareId !== shareId));
              }}
            />
          )}
          {tab === 'book' && (
            <BookScreen
              recipes={recipes}
              categories={categories}
              openId={bookRecipeId}
              onOpenPage={(id) => setBookRecipeId(id)}
              onClosePage={() => setBookRecipeId(null)}
              onPrint={(list) => { setShowPrintSheet(false); setPrintJob(list); }}
              onSelectPrint={() => setShowPrintSheet(true)}
            />
          )}
          {tab === 'favorites' && (
            <FavoritesScreen
              recipes={recipes}
              onOpen={r => setOpenRecipeId(r.id)}
              onToggleFav={toggleFav}
              density={density}
              variant={CARD_VARIANT}
              onNav={navTo}
            />
          )}
          {tab === 'add' && (
            <AddRecipeScreen
              onAdd={addRecipe}
              onCancel={() => { formDirtyRef.current = false; navTo('home'); }}
              categories={categories}
              onAddCategory={() => setShowAddCategory(true)}
              onDirtyChange={(d) => { formDirtyRef.current = d; }}
              step={formStep}
              onStepChange={setFormStep}
            />
          )}
          {!anyOverlay && <BottomNav active={tab} onChange={navTo} />}
        </div>

        {/* Overlay: recipe detail (own recipe) */}
        {openRecipe && !editingRecipe && (
          <DetailScreen
            recipe={openRecipe}
            onClose={() => setOpenRecipeId(null)}
            onToggleFav={toggleFav}
            onOpenSteps={(r, servings) => { setCookRecipeId(r.id); setCookServings(servings || r.servings || 1); }}
            onEdit={(r) => setEditingRecipeId(r.id)}
            onDelete={(r) => setDeletingRecipeId(r.id)}
            onUpdateNotes={updateNotes}
            onShare={(r) => setSharingRecipe(r)}
            openMs={openMs}
          />
        )}

        {/* Overlay: shared recipe detail (read-only) */}
        {!openRecipe && !editingRecipe && (() => {
          const shared = sharedWithMe.find(r => r._shareId && openRecipeId === r._shareId + '__shared');
          if (!shared) return null;
          return (
            <DetailScreen
              recipe={shared}
              onClose={() => setOpenRecipeId(null)}
              onToggleFav={() => {}}
              onOpenSteps={(r, servings) => { setCookRecipeId(r.id); setCookServings(servings || r.servings || 1); }}
              readOnly={true}
              openMs={openMs}
            />
          );
        })()}

        {/* Overlay: edit recipe */}
        {editingRecipe && (
          <div style={{ position: 'absolute', inset: 0, background: '#fbeef2', zIndex: 24 }}>
            <EditRecipeScreen
              recipe={editingRecipe}
              onSave={updateRecipe}
              onCancel={() => setEditingRecipeId(null)}
              categories={categories}
              onAddCategory={() => setShowAddCategory(true)}
              step={formStep}
              onStepChange={setFormStep}
            />
          </div>
        )}

        {/* Overlay: cooking steps */}
        {cookRecipe && (
          <CookScreen recipe={cookRecipe} servings={cookServings}
            onClose={() => setCookRecipeId(null)} />
        )}

        {/* Overlay: delete confirmation */}
        {deletingRecipe && (
          <DeleteConfirm
            recipe={deletingRecipe}
            onConfirm={() => deleteRecipe(deletingRecipeId)}
            onCancel={() => setDeletingRecipeId(null)}
          />
        )}

        {/* Transient message, the save indicator, and the offline notice */}
        {toast && <Toast message={toast.msg} tone={toast.tone} onDismiss={() => setToast(null)} />}
        <SaveState
          state={!online && (syncMeta.hasPendingWrites || saveState.pending) ? 'offline' : saveState.state}
          pending={saveState.pending}
          onRetry={() => { if (retryLastSave.current) retryLastSave.current(); }} />
        {!online && <OfflineBanner pending={syncMeta.hasPendingWrites} />}

        {showAddCategory && (
          <AddCategorySheet
            onAdd={(cat) => { addCategory(cat); setShowAddCategory(false); }}
            onCancel={() => setShowAddCategory(false)}
          />
        )}
        {showManageCategories && (
          <ManageCategoriesSheet
            categories={categories.filter(c => c.id !== 'all')}
            onEdit={editCategory}
            onDelete={deleteCategory}
            onAdd={(cat) => addCategory(cat)}
            onClose={() => setShowManageCategories(false)}
          />
        )}
        {sharingRecipe && (
          <RecipeSelectSheet
            initialRecipe={sharingRecipe}
            recipes={recipes}
            categories={categories}
            onShare={async (email, selectedRecipes) => {
              if (!currentUser) return;
              try {
                await Promise.all(selectedRecipes.map(r => db_shareRecipeWith(currentUser, email, r)));
                setSharingRecipe(null);
                const count = selectedRecipes.length;
                showToast(count === 1
                  ? `"${selectedRecipes[0].title}" שותף עם ${email} ✓`
                  : `${count} מתכונים שותפו עם ${email} ✓`);
              } catch (err) { reportError('share-recipe', err); showToast('שגיאה בשיתוף', 'danger'); }
            }}
            onClose={() => setSharingRecipe(null)}
          />
        )}
        {showAccountPanel && (
          <AccountPanel
            user={currentUser}
            recipes={recipes}
            onExport={handleExport}
            onImport={handleImport}
            themeMode={themeMode}
            onThemeChange={setThemeMode}
            onResetServings={async () => {
              const affected = recipes.filter(r => +r.servings > 0);
              setRecipes(rs => rs.map(r => (+r.servings > 0 ? { ...r, servings: 0 } : r)));
              try {
                await Promise.all(affected.map(r => db_saveRecipe({ ...r, servings: 0 })));
                showToast(`מספר המנות אופס ב-${affected.length} מתכונים`, 'success');
              } catch (err) {
                reportError('reset-servings', err);
                showToast('האיפוס נכשל', 'danger');
              }
            }}
            sharesInfo={sharesInfo}
            pendingInvites={pendingInvites}
            onClose={() => setShowAccountPanel(false)}
            onSignOut={async () => {
              setShowAccountPanel(false);
              await auth_signOut();
            }}
            onInvite={async (email, mutual) => {
              if (!currentUser) return;
              try {
                await db_createInvite(currentUser.uid, currentUser.email, currentUser.displayName, email, mutual);
                const inv = await db_getMyInvites(currentUser.uid);
                setPendingInvites(inv);
                showToast(`הזמנה נשלחה ל-${email} ✓`);
              } catch (err) { reportError('invite', err); showToast('שגיאה בשליחת ההזמנה', 'danger'); }
            }}
            onCancelInvite={async (inviteId) => {
              try {
                await db_cancelInvite(inviteId);
                setPendingInvites(p => p.filter(i => i.id !== inviteId));
              } catch (err) { reportError('account-action', err); showToast('הפעולה נכשלה', 'danger'); }
            }}
            onRevokeShare={async (shareId) => {
              try {
                await db_revokeShare(shareId);
                const shares = await db_getMyShares(currentUser.uid);
                setSharesInfo(shares);
                const ownerUids = shares.asGuest.map(s => s.ownerUid);
                setSharedOwnerUids(ownerUids);
                if (recipesUnsubRef.current) recipesUnsubRef.current();
                recipesUnsubRef.current = db_watchRecipes(currentUser.uid, ownerUids,
                  (recs, meta) => { setRecipes(recs || []); setSyncMeta({ fromCache: !!meta.fromCache, hasPendingWrites: !!meta.hasPendingWrites }); },
                  (err) => reportError('watch-recipes', err));
                showToast('השיתוף בוטל');
              } catch (err) { reportError('account-action', err); showToast('הפעולה נכשלה', 'danger'); }
            }}
          />
        )}
        {showPrintSheet && (
          <PrintSelectSheet
            recipes={recipes}
            categories={categories}
            onPrint={(list) => { setShowPrintSheet(false); setPrintJob(list); }}
            onClose={() => setShowPrintSheet(false)}
          />
        )}
        {showNavGuard && (
          <UnsavedChangesDialog
            onStay={() => { setShowNavGuard(false); setPendingNav(null); }}
            onLeave={confirmNavLeave}
          />
        )}

        {showInstall && (
          <InstallPrompt
            isIOS={isIOS}
            canNativeInstall={!!installPrompt}
            onInstall={async () => {
              if (installPrompt) {
                installPrompt.prompt();
                const r = await installPrompt.userChoice;
                if (r.outcome === 'accepted') setShowInstall(false);
              }
            }}
            onDismiss={() => { setShowInstall(false); try { localStorage.setItem('maites.install.dismissed','1'); } catch {} }}
          />
        )}

        {!hintSeen && !anyOverlay && tab === 'home' && (
          <FirstHint onDismiss={() => { setHintSeen(true); try { localStorage.setItem('receips.hint','1'); } catch {} }}/>
        )}

        {/* Claim unclaimed recipes prompt */}
        {showClaimPrompt && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 70,
            background: 'rgba(28,22,32,.6)', backdropFilter: 'blur(10px)',
            display: 'grid', placeItems: 'center', padding: 24,
          }}>
            <div style={{
              background: 'var(--cream)', borderRadius: 28,
              padding: '32px 28px', textAlign: 'center', maxWidth: 340,
              boxShadow: 'var(--e1)',
            }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🍽️</div>
              <h2 style={{ margin: '0 0 10px', fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                נמצאו מתכונים!
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                יש מתכונים שלא משויכים לאף חשבון.
                האם לשייך אותם לחשבון שלך?
              </p>
              <button onClick={handleClaimRecipes} disabled={claiming} style={{
                width: '100%', border: 'none', borderRadius: 16, padding: '14px 0',
                background: 'var(--ink)', color: '#fff',
                fontFamily: 'inherit', fontWeight: 700, fontSize: 16, cursor: 'pointer',
                marginBottom: 10, opacity: claiming ? .7 : 1,
              }}>{claiming ? 'מעביר…' : 'כן, שייך אליי'}</button>
              <button onClick={() => {
                localStorage.setItem(`maites.claimed.${currentUser.uid}`, '1');
                setShowClaimPrompt(false);
              }} style={{
                width: '100%', border: 'none', borderRadius: 16, padding: '12px 0',
                background: 'var(--surface-sunken)', color: 'var(--ink-soft)',
                fontFamily: 'inherit', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>דלג בינתיים</button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes toastIn{0%{opacity:0;transform:translate(-50%,12px)}100%{opacity:1;transform:translate(-50%,0)}}
        `}</style>
      </div>

      {printJob && (
        <PdfBook
          recipes={printJob}
          categories={categories}
          onDone={() => { setPrintJob(null); showToast('קובץ ה-PDF הורד ✓'); }}
          onError={(err) => {
            setPrintJob(null);
            reportError('pdf-export', err);
            showToast(navigator.onLine ? 'יצירת ה-PDF נכשלה' : 'צריך חיבור לאינטרנט ליצירת PDF');
          }}
        />
      )}

    </AnimSpeedContext.Provider>
  );
}

function FirstHint({ onDismiss }) {
  return (
    <div onClick={onDismiss} style={{
      position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'auto',
      animation: 'hintFade .4s ease',
    }}>
      <div style={{
        position: 'absolute', top: 220, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(28,22,32,.94)', color: '#fff',
        padding: '12px 16px', borderRadius: 18, fontSize: 13, fontWeight: 600,
        boxShadow: 'var(--e1)',
        display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
      }}>
        ✨ הקישו על כרטיס לצפייה במתכון
      </div>
      <style>{`@keyframes hintFade{0%{opacity:0}100%{opacity:1}}`}</style>
    </div>
  );
}

function InstallPrompt({ isIOS, canNativeInstall, onInstall, onDismiss }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60,
      padding: '0 16px 32px',
      animation: 'installSlide .4s cubic-bezier(.2,1.2,.4,1)',
    }}>
      <div style={{
        background: 'var(--cream)',
        borderRadius: 28,
        boxShadow: '0 -4px 40px rgba(64,33,50,.18), 0 20px 60px rgba(64,33,50,.18)',
        padding: '20px 20px 18px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg,#f7a8b8,#c9b8e8)',
            display: 'grid', placeItems: 'center', fontSize: 26,
          }}>🍳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
              התקיני את Maites
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
              גישה מהירה לכל המתכונים שלך
            </div>
          </div>
          <button onClick={onDismiss} style={{
            background: 'var(--surface-sunken)', border: 'none', borderRadius: 'var(--r-pill)',
            width: 30, height: 30, fontSize: 18, color: 'var(--ink-soft)',
            cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}>×</button>
        </div>

        {isIOS ? (
          <div style={{
            background: 'rgba(247,168,184,.15)', borderRadius: 16, padding: '12px 14px',
            fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.7, textAlign: 'right',
          }}>
            בספארי: לחצי על <strong>שתף</strong> (□↑) ← <strong>"הוסף למסך הבית"</strong>
          </div>
        ) : canNativeInstall ? (
          <button onClick={onInstall} style={{
            background: 'linear-gradient(135deg,#f7a8b8,#c9b8e8)',
            border: 'none', borderRadius: 18,
            padding: '13px 0', fontFamily: 'var(--font-display)',
            fontWeight: 700, fontSize: 15, color: 'var(--ink)',
            cursor: 'pointer', width: '100%',
          }}>
            התקיני עכשיו
          </button>
        ) : (
          <div style={{
            background: 'rgba(247,168,184,.15)', borderRadius: 16, padding: '12px 14px',
            fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.7, textAlign: 'right',
          }}>
            בכרום: תפריט (⋮) ← <strong>"הוסף למסך הבית"</strong> / <strong>"התקן אפליקציה"</strong>
          </div>
        )}
      </div>
      <style>{`@keyframes installSlide{0%{opacity:0;transform:translateY(80px)}100%{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <App/>
  </AppErrorBoundary>
);
// Tells the boot watchdog in index.html that the app is up.
window.dispatchEvent(new Event('maites-ready'));
