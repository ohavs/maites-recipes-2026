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

  const [recipes, setRecipes] = $S(RECIPES);
  const [tab, setTab] = $S('home');
  const [category, setCategory] = $S('all');
  const [openRecipeId, setOpenRecipeId] = $S(null);
  const [cookRecipeId, setCookRecipeId] = $S(null);
  const [editingRecipeId, setEditingRecipeId] = $S(null);
  const [deletingRecipeId, setDeletingRecipeId] = $S(null);
  const [toast, setToast] = $S(null);
  const [density, setDensity] = $S(t.density || 'comfy');
  $E(() => { setDensity(t.density || 'comfy'); }, [t.density]);

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

  const toggleFav = (id) =>
    setRecipes(rs => rs.map(r => r.id === id ? { ...r, favorite: !r.favorite } : r));

  const addRecipe = (rec) => {
    setRecipes(rs => [rec, ...rs]);
    setTab('home');
    showToast(`"${rec.title}" נוסף לאוסף 🎉`);
  };

  const updateRecipe = (rec) => {
    setRecipes(rs => rs.map(r => r.id === rec.id ? { ...r, ...rec } : r));
    setEditingRecipeId(null);
    showToast(`עודכן: "${rec.title}"`);
  };

  const updateNotes = (id, notes) =>
    setRecipes(rs => rs.map(r => r.id === id ? { ...r, notes } : r));

  const deleteRecipe = (id) => {
    setRecipes(rs => rs.filter(r => r.id !== id));
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
      setRecipes(recs);
      showToast(`${recs.length} מתכונים יובאו בהצלחה`);
      setTab('home');
    });
    e.target.value = '';
  };

  const navTo = (id) => {
    if (id === 'add')            setTab('add');
    else if (id === 'favorites') setTab('favorites');
    else                         setTab('home');
  };

  const openMs = t.anim === 'off' ? 0 : t.anim === 'fast' ? 240 : t.anim === 'slow' ? 600 : 380;
  const anyOverlay = !!(openRecipe || cookRecipe || editingRecipe);

  return (
    <AnimSpeedContext.Provider value={t.anim}>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>

        {/* Main tab screens */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {tab === 'home' && (
            <HomeScreen
              recipes={recipes}
              onOpen={r => setOpenRecipeId(r.id)}
              onToggleFav={toggleFav}
              density={density}
              onDensity={(d) => { setDensity(d); setTweak('density', d); }}
              variant={t.cardVariant}
              category={category}
              onCategory={setCategory}
              sharedKey={`${t.cardVariant}-${density}`}
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
            />
          )}
          {!anyOverlay && <BottomNav active={tab} onChange={navTo} />}
        </div>

        {/* Overlay: recipe detail */}
        {openRecipe && !editingRecipe && (
          <DetailScreen
            recipe={openRecipe}
            onClose={() => setOpenRecipeId(null)}
            onToggleFav={toggleFav}
            onOpenSteps={(r) => setCookRecipeId(r.id)}
            onEdit={(r) => setEditingRecipeId(r.id)}
            onDelete={(r) => setDeletingRecipeId(r.id)}
            onUpdateNotes={updateNotes}
            openMs={openMs}
          />
        )}

        {/* Overlay: edit recipe */}
        {editingRecipe && (
          <div style={{ position: 'absolute', inset: 0, background: '#fbeef2', zIndex: 10 }}>
            <EditRecipeScreen
              recipe={editingRecipe}
              onSave={updateRecipe}
              onCancel={() => setEditingRecipeId(null)}
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

        {!hintSeen && !anyOverlay && tab === 'home' && (
          <FirstHint onDismiss={() => { setHintSeen(true); try { localStorage.setItem('receips.hint','1'); } catch {} }}/>
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

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
