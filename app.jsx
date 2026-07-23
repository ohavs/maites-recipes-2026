// app.jsx — root App, screen routing, tweaks, transitions

const { useState: $S, useRef: $R, useEffect: $E, useMemo: $M } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfy",
  "anim": "normal",
  "cardVariant": "block",
  "showHints": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [recipes, setRecipes] = $S([]);
  const [recipesLoaded, setRecipesLoaded] = $S(false);
  const [categories, setCategories] = $S(() => {
    try { const s = localStorage.getItem('maites.cats'); return s ? JSON.parse(s) : CATEGORIES; }
    catch { return CATEGORIES; }
  });
  const [tab, setTab] = $S('home');
  const [category, setCategory] = $S('all');
  const [showAddCategory, setShowAddCategory] = $S(false);
  const [openRecipeId, setOpenRecipeId] = $S(null);
  const [cookRecipeId, setCookRecipeId] = $S(null);
  const [editingRecipeId, setEditingRecipeId] = $S(null);
  const [deletingRecipeId, setDeletingRecipeId] = $S(null);
  const [toast, setToast] = $S(null);
  const [density, setDensity] = $S(() => {
    try { return localStorage.getItem('maites.density') || t.density || 'comfy'; }
    catch { return t.density || 'comfy'; }
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
  const [sharesInfo, setSharesInfo] = $S({ asOwner: [], asGuest: [] });
  const [pendingInvites, setPendingInvites] = $S([]);
  const [sharedOwnerUids, setSharedOwnerUids] = $S([]);
  const [sharedWithMe, setSharedWithMe] = $S([]);
  const [sharingRecipe, setSharingRecipe] = $S(null);

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
  const cookRecipe     = recipes.find(r => r.id === cookRecipeId)     || null;
  const editingRecipe  = recipes.find(r => r.id === editingRecipeId)  || null;
  const deletingRecipe = recipes.find(r => r.id === deletingRecipeId) || null;

  const loadUserData = async (user) => {
    setRecipesLoaded(false);
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
      // Load recipes (own + shared accounts)
      const recs = await db_loadRecipes(user.uid, ownerUids);
      setRecipes(recs || []);
      setRecipesLoaded(true);
      // Claim prompt (one-time migration)
      const claimedKey = `maites.claimed.${user.uid}`;
      if (!localStorage.getItem(claimedKey)) {
        const has = await db_hasUnownedRecipes();
        if (has) setShowClaimPrompt(true);
        else localStorage.setItem(claimedKey, '1');
      }
    } catch { setRecipesLoaded(true); }
    db_loadCategories().then(cats => {
      if (cats && cats.length > 0) {
        setCategories(cats);
        try { localStorage.setItem('maites.cats', JSON.stringify(cats)); } catch {}
      }
    }).catch(() => {});
  };

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
    return () => unsub();
  }, []);

  const addCategory = (cat) => {
    const next = [...categories, cat];
    setCategories(next);
    try { localStorage.setItem('maites.cats', JSON.stringify(next)); } catch {}
    if (typeof db_saveCategories !== 'undefined') db_saveCategories(next).catch(() => {});
  };

  const editCategory = (id, updates) => {
    const next = categories.map(c => c.id === id ? { ...c, ...updates } : c);
    setCategories(next);
    try { localStorage.setItem('maites.cats', JSON.stringify(next)); } catch {}
    if (typeof db_saveCategories !== 'undefined') db_saveCategories(next).catch(() => {});
  };

  const deleteCategory = (id) => {
    const next = categories.filter(c => c.id !== id);
    setCategories(next);
    try { localStorage.setItem('maites.cats', JSON.stringify(next)); } catch {}
    if (typeof db_saveCategories !== 'undefined') db_saveCategories(next).catch(() => {});
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
      if (changed && typeof db_saveRecipe !== 'undefined') db_saveRecipe(changed).catch(() => {});
      return updated;
    });

  const addRecipe = (rec) => {
    ensureCategoryExists(rec.category, categories, rec._catInfo);
    setRecipes(rs => [rec, ...rs]);
    if (typeof db_saveRecipe !== 'undefined') db_saveRecipe(rec).catch(() => {});
    setTab('home');
    showToast(`"${rec.title}" נוסף לאוסף 🎉`);
  };

  const updateRecipe = (rec) => {
    setRecipes(rs => rs.map(r => r.id === rec.id ? { ...r, ...rec } : r));
    if (typeof db_saveRecipe !== 'undefined') db_saveRecipe(rec).catch(() => {});
    setEditingRecipeId(null);
    showToast(`עודכן: "${rec.title}"`);
  };

  const updateNotes = (id, notes) =>
    setRecipes(rs => {
      const updated = rs.map(r => r.id === id ? { ...r, notes } : r);
      const changed = updated.find(r => r.id === id);
      if (changed && typeof db_saveRecipe !== 'undefined') db_saveRecipe(changed).catch(() => {});
      return updated;
    });

  const deleteRecipe = (id) => {
    setRecipes(rs => rs.filter(r => r.id !== id));
    if (typeof db_deleteRecipe !== 'undefined') db_deleteRecipe(id).catch(() => {});
    setOpenRecipeId(null);
    setDeletingRecipeId(null);
    showToast('המתכון נמחק');
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
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
      if (err) { showToast(err.message || 'שגיאה בקריאת הקובץ'); return; }
      if (!recs?.length) { showToast('לא נמצאו מתכונים בקובץ'); return; }

      // Auto-create categories for incoming recipes (uses current categories state)
      recs.forEach(r => ensureCategoryExists(r.category, categories, r._catInfo));

      // Deduplicate by title (case-insensitive)
      setRecipes(existing => {
        const existingTitles = new Set(existing.map(r => r.title.trim().toLowerCase()));
        const newRecs = recs.filter(r => !existingTitles.has(r.title.trim().toLowerCase()));
        const dupCount = recs.length - newRecs.length;

        if (newRecs.length > 0 && typeof db_saveRecipe !== 'undefined') {
          newRecs.forEach(r => db_saveRecipe(r).catch(() => {}));
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

  const navTo = (id) => {
    if (tab === 'add' && id !== 'add' && formDirtyRef.current) {
      setPendingNav(id);
      setShowNavGuard(true);
      return;
    }
    formDirtyRef.current = false;
    if (id === 'add')            setTab('add');
    else if (id === 'favorites') setTab('favorites');
    else                         setTab('home');
  };
  const confirmNavLeave = () => {
    const id = pendingNav;
    setShowNavGuard(false); setPendingNav(null); formDirtyRef.current = false;
    if (id === 'add') setTab('add');
    else if (id === 'favorites') setTab('favorites');
    else setTab('home');
  };

  const openMs = t.anim === 'off' ? 0 : t.anim === 'fast' ? 240 : t.anim === 'slow' ? 600 : 380;
  const anyOverlay = !!(openRecipe || cookRecipe || editingRecipe);

  const handleClaimRecipes = async () => {
    if (!currentUser) return;
    setClaiming(true);
    try {
      const count = await db_claimUnownedRecipes(currentUser.uid);
      const recs = await db_loadRecipes(currentUser.uid);
      setRecipes(recs || []);
      localStorage.setItem(`maites.claimed.${currentUser.uid}`, '1');
      setShowClaimPrompt(false);
      if (count > 0) showToast(`${count} מתכונים שויכו לחשבון שלך ✓`);
    } catch (e) {
      showToast('שגיאה בשיוך המתכונים');
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
          <img src="/icon.svg" alt="Maites" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 16, opacity: .85 }}/>
          <div style={{ fontSize: 15 }}>טוענת…</div>
        </div>
      </div>
    );
  }

  // Not signed in → show login screen
  if (!currentUser) {
    return <LoginScreen onSignIn={auth_signInWithGoogle} />;
  }

  return (
    <AnimSpeedContext.Provider value={t.anim}>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>

        {/* Main tab screens */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {tab === 'home' && (
            <HomeScreen
              recipes={recipes}
              recipesLoaded={recipesLoaded}
              onOpen={r => setOpenRecipeId(r.id)}
              onToggleFav={toggleFav}
              density={density}
              onDensity={(d) => { setDensity(d); setTweak('density', d); try { localStorage.setItem('maites.density', d); } catch {} }}
              variant={t.cardVariant}
              category={category}
              onCategory={setCategory}
              sharedKey={`${t.cardVariant}-${density}`}
              categories={categories}
              onAddCategory={() => setShowAddCategory(true)}
              onManageCategories={() => setShowManageCategories(true)}
              currentUser={currentUser}
              onOpenAccount={() => setShowAccountPanel(true)}
              sharedWithMe={sharedWithMe}
              onOpenShared={r => setOpenRecipeId(r._shareId ? r._shareId + '__shared' : r.id)}
              onRemoveShared={async (shareId) => {
                await db_removeSharedRecipe(shareId).catch(() => {});
                setSharedWithMe(s => s.filter(r => r._shareId !== shareId));
              }}
            />
          )}
          {tab === 'favorites' && (
            <FavoritesScreen
              recipes={recipes}
              onOpen={r => setOpenRecipeId(r.id)}
              onToggleFav={toggleFav}
              density={density}
              variant={t.cardVariant}
              onNav={navTo}
            />
          )}
          {tab === 'add' && (
            <AddRecipeScreen
              onAdd={addRecipe}
              onExport={handleExport}
              onImport={handleImport}
              categories={categories}
              onAddCategory={() => setShowAddCategory(true)}
              onDirtyChange={(d) => { formDirtyRef.current = d; }}
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
            onOpenSteps={(r) => setCookRecipeId(r.id)}
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
              onOpenSteps={(r) => setCookRecipeId(r.id)}
              readOnly={true}
              openMs={openMs}
            />
          );
        })()}

        {/* Overlay: edit recipe */}
        {editingRecipe && (
          <div style={{ position: 'absolute', inset: 0, background: '#fbeef2', zIndex: 10 }}>
            <EditRecipeScreen
              recipe={editingRecipe}
              onSave={updateRecipe}
              onCancel={() => setEditingRecipeId(null)}
              categories={categories}
              onAddCategory={() => setShowAddCategory(true)}
            />
          </div>
        )}

        {/* Overlay: cooking steps */}
        {cookRecipe && (
          <StepsScreen recipe={cookRecipe} onClose={() => setCookRecipeId(null)} />
        )}

        {/* Overlay: delete confirmation */}
        {deletingRecipe && (
          <DeleteConfirm
            recipe={deletingRecipe}
            onConfirm={() => deleteRecipe(deletingRecipeId)}
            onCancel={() => setDeletingRecipeId(null)}
          />
        )}

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(28,22,32,.95)', color: '#fff',
            padding: '12px 18px', borderRadius: 999,
            fontSize: 13.5, fontWeight: 600, zIndex: 50,
            boxShadow: '0 12px 30px rgba(0,0,0,.3)',
            animation: 'toastIn .3s cubic-bezier(.2,1.3,.4,1)',
            whiteSpace: 'nowrap', maxWidth: '85%', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{toast}</div>
        )}

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
          <ShareRecipeSheet
            recipe={sharingRecipe}
            onShare={async (email) => {
              if (!currentUser) return;
              try {
                await db_shareRecipeWith(currentUser, email, sharingRecipe);
                setSharingRecipe(null);
                showToast(`"${sharingRecipe.title}" שותף עם ${email} ✓`);
              } catch { showToast('שגיאה בשיתוף'); }
            }}
            onClose={() => setSharingRecipe(null)}
          />
        )}
        {showAccountPanel && (
          <AccountPanel
            user={currentUser}
            recipes={recipes}
            sharesInfo={sharesInfo}
            pendingInvites={pendingInvites}
            onClose={() => setShowAccountPanel(false)}
            onSignOut={async () => {
              setShowAccountPanel(false);
              await auth_signOut();
            }}
            onInvite={async (email) => {
              if (!currentUser) return;
              try {
                await db_createInvite(currentUser.uid, currentUser.email, currentUser.displayName, email);
                const inv = await db_getMyInvites(currentUser.uid);
                setPendingInvites(inv);
                showToast(`הזמנה נשלחה ל-${email} ✓`);
              } catch { showToast('שגיאה בשליחת ההזמנה'); }
            }}
            onCancelInvite={async (inviteId) => {
              try {
                await db_cancelInvite(inviteId);
                setPendingInvites(p => p.filter(i => i.id !== inviteId));
              } catch { showToast('שגיאה'); }
            }}
            onRevokeShare={async (shareId) => {
              try {
                await db_revokeShare(shareId);
                const shares = await db_getMyShares(currentUser.uid);
                setSharesInfo(shares);
                const ownerUids = shares.asGuest.map(s => s.ownerUid);
                setSharedOwnerUids(ownerUids);
                const recs = await db_loadRecipes(currentUser.uid, ownerUids);
                setRecipes(recs || []);
                showToast('השיתוף בוטל');
              } catch { showToast('שגיאה'); }
            }}
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
              boxShadow: '0 24px 60px rgba(0,0,0,.25)',
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
                background: 'rgba(0,0,0,.07)', color: 'var(--ink-soft)',
                fontFamily: 'inherit', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>דלג בינתיים</button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes toastIn{0%{opacity:0;transform:translate(-50%,12px)}100%{opacity:1;transform:translate(-50%,0)}}
        `}</style>
      </div>

      {/* Tweaks panel — position:fixed, floats above the app */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="כרטיסים" />
        <TweakRadio label="גודל"
          value={density}
          options={[
            { value: 'compact', label: 'קומפקטי' },
            { value: 'comfy',   label: 'נוח' },
            { value: 'grid',    label: 'גריד' },
          ]}
          onChange={v => { setDensity(v); setTweak('density', v); }}/>
        <TweakSelect label="סגנון"
          value={t.cardVariant}
          options={[
            { value: 'block', label: 'בלוק צבע (TikTok)' },
            { value: 'soft',  label: 'גרדיאנט רך' },
            { value: 'bleed', label: 'בלוק פלאט' },
          ]}
          onChange={v => setTweak('cardVariant', v)}/>
        <TweakSection label="אנימציות" />
        <TweakRadio label="מהירות"
          value={t.anim}
          options={[
            { value: 'slow',   label: 'איטי' },
            { value: 'normal', label: 'רגיל' },
            { value: 'fast',   label: 'מהיר' },
            { value: 'off',    label: 'כבוי' },
          ]}
          onChange={v => setTweak('anim', v)}/>
      </TweaksPanel>
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
        boxShadow: '0 12px 30px rgba(0,0,0,.35)',
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
            background: 'rgba(0,0,0,.06)', border: 'none', borderRadius: 999,
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

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
