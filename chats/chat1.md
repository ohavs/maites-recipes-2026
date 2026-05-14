# Recipe App UI Clone

_Started 2026-05-14 04:37 UTC_

---

## User

https://vt.tiktok.com/ZSxJtHP3p/
אני רוצה ליצור אפליקציה ליצירת מתכונים. מבחינת הUI אני רוצה כמעט 1ל1 כמו בסרטון הטיקטוק שצירפתי - החל מהUI ועד לרמת האנימציות והנפשות.
אם אתה לא יכול לצפות בסרטון - צירפתי לך 2 צילומי מסך - צילום אחד מהמסך הראשי שמראה את כל המתכונים, וצילום שני של איך נראה מתכון כשנכנסים לקרוא אותו.
שים לב ששפת העיצוב היא יותר צבעונית, "תלת מימדית" עם דגש על הפרדות ואלמנטים יחסית גדולים. 
שאל אותי את כל השאלות המכווינות שתצטרך בכדי ליישם דבר כזה

## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- platform: Decide for me
- scope: מסך ראשי (רשימת מתכונים), מסך מתכון בודד (עם מצרכים), הוראות הכנה / step-by-step, מסך מועדפים, מסך הוספת מתכון חדש, מסך חיפוש / קטגוריות
- recipes_type: מגוון רחב - גם עיקריות, סלטים וכו'
- num_recipes: 6
- interactions: מעבר רך מהכרטיס ברשימה למסך המלא (shared element transition), אנימציית כניסה לכרטיסים (stagger), Scroll-based parallax על התמונה במסך הפנימי, כפתור מועדפים עם אנימציה
- card_style: להציע 2-3 וריאציות דרך Tweaks
- palette: פסטלים נוספים (סגול, ירוק, אפרסק)
- language: עברית (RTL)
- typography: Display חביב/מעוגל (Fraunces/Quicksand)
- images: להשתמש ב-image-slot שאתה יכול לגרור אליו תמונות אחר כך
- depth: תנועות פרספקטיבה (tilt על hover/scroll)
- tweaks: גודל הכרטיסים (קומפקטי/נוח), סגנון אנימציות (איטי/מהיר/ללא)
- extras: האפליקציה תהיה בנויה כך:
מסך ראשי שמחזיק את האפליקציות. אפשרות פילטור לפי קטגוריות.
מסך מעוצב לכל מתכון. אפשרות חיפוש בתוך האפליקציה.
אפשרות ייצוא לאקסל(בפורמט שאפשר יהיה גם לייבא את הקובץ הזה לתוך האפליקציה, במקרה שקורה משהו לנתונים) וגם ייצוא לוורד - עם עיצוב יפה והפרדה ברורה בין מתכונים. דגש על אנימציות, צבעוניות, תלת מימדיות, והרגשה כללית כמו בסרטון ויותר טוב מזה

## Assistant

_[tool: list_files]_

_[tool: update_todos]_

_[tool: copy_starter_component]_

_[tool: copy_starter_component]_

_[tool: copy_starter_component]_

_[tool: set_project_title]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: write_file]_

Building the app. Let me start with the entry HTML and core components.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

Now the heart of the design — reusable components (card, tilt, image, bottom-nav):

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: grep]_

_[tool: read_file]_

_[tool: show_html]_

_[tool: done]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: str_replace_edit]_

Looking great overall! A few polish issues to fix:
1. Header title wrapping awkwardly behind search button
2. The "+" home indicator showing through the bottom nav

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: read_file]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: str_replace_edit]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: get_webview_logs]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: sleep]_

_[tool: eval_js]_

_[tool: sleep]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

_[tool: eval_js]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: str_replace_edit]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: str_replace_edit]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: snip]_

_[tool: update_todos]_

_[tool: done]_

Everything's working. Let me snip exploration and finalize.

_[tool: fork_verifier_agent]_

האפליקציה מוכנה 🎉

**מה יש בפנים:**
- **מסך ראשי** — 6 מתכונים מגוונים (קינוחים, עיקריות, סלטים, ארוחת בוקר) בכרטיסים פסטליים בלוקים עם איורי SVG מותאמים
- **מסך מתכון** — היירו צבעוני עם פרלקסה על גלילה, פילים של זמן/מנות/רמה, רשימת מצרכים עם stagger
- **מסך הוראות step-by-step** — שלב-אחרי-שלב, פס התקדמות, סימון "בוצע" לכל שלב
- **חיפוש + קטגוריות** — חיפוש חי בכותרת/תיאור/מצרכים, פילטר לפי 6 קטגוריות
- **מועדפים** — כפתור לב עם בעבעה ופיצוץ של נקודות
- **הוספת מתכון** — טופס מלא עם תצוגה מקדימה חיה
- **ייצוא** — CSV ל-Excel (ניתן לייבוא בחזרה בלחיצה), ו-HTML מעוצב לוורד (.doc)

**אינטראקציות:**
- אנימציית כניסה stagger לכרטיסים, tilt בפרספקטיבה על מעבר עכבר, פרלקסה על תמונת ההיירו, פיצוץ לבבות, מעברי עומק לכרטיסי שלב

**Tweaks (פתח דרך הטוגל בסרגל):**
- גודל כרטיסים (קומפקטי/נוח)
- סגנון (בלוק/גרדיאנט רך/בלוק פלאט)
- מהירות אנימציה (איטי/רגיל/מהיר/כבוי)

**תמונות:** כל מתכון מציג איור SVG מובנה כברירת מחדל — ניתן לגרור תמונת מאכל אמיתית על המעגל (גם בכרטיס וגם במסך הפנימי) והיא נשמרת.

