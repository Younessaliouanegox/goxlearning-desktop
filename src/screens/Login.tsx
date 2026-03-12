import React, { useState } from 'react'
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight, Shield, BookOpen, MessageCircle, CheckSquare } from 'lucide-react'
import { supabaseAuth } from '../lib/supabase'
import { colors } from '../lib/theme'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs')
      return
    }
    setError('')
    setLoading(true)
    const { error: err } = await supabaseAuth.auth.signInWithPassword({ email: email.trim(), password })
    if (err) setError(err.message)
    setLoading(false)
  }

  const features = [
    { Icon: BookOpen, label: 'Sessions & Ressources' },
    { Icon: MessageCircle, label: 'Chat de groupe' },
    { Icon: CheckSquare, label: 'Gestion des tâches' },
    { Icon: Shield, label: 'Accès sécurisé' },
  ]

  return (
    <div style={styles.container}>
      {/* ═══ LEFT — Branding panel ═══ */}
      <div style={styles.leftPanel}>
        <div style={styles.bgImage} />
        <div style={styles.bgOverlay} />

        <div style={styles.leftContent}>
          {/* Top — Logo */}
          <div>
            <img src="/logo-dark.png" alt="GoxLearning" style={styles.leftLogo} />
          </div>

          {/* Center — Hero */}
          <div>
            <h2 style={styles.heroTitle}>
              Votre espace<br />
              <span style={{ color: '#60a5fa' }}>étudiant</span>, simplifié.
            </h2>
            <p style={styles.heroSub}>
              Accédez à vos cours, discutez avec votre groupe, gérez vos tâches et contactez le support — tout en un.
            </p>

            {/* Feature pills */}
            <div style={styles.pillRow}>
              {features.map((f, i) => (
                <div key={i} style={styles.pill}>
                  <f.Icon size={13} color="#60a5fa" />
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom — Stats */}
          <div>
            <div style={styles.statsRow}>
              {[
                { value: '500+', label: 'Étudiants' },
                { value: '20+', label: 'Formations' },
                { value: '98%', label: 'Satisfaction' },
              ].map((s, i) => (
                <div key={i}>
                  <div style={styles.statValue}>{s.value}</div>
                  <div style={styles.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={styles.divider} />
            <p style={styles.leftFooter}>
              GoxLearning Academy &mdash; Espace Étudiant v1.0
            </p>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT — Login form ═══ */}
      <div style={styles.rightPanel}>
        <div style={styles.formWrapper}>
          {/* Logo */}
          <img src="/logo-light.png" alt="GoxLearning" style={styles.rightLogo} />

          {/* Welcome */}
          <div style={styles.welcomeSection}>
            <div style={styles.iconBadge}>
              <Shield size={18} color="#fff" />
            </div>
            <h1 style={styles.welcomeTitle}>Connexion</h1>
            <p style={styles.welcomeSub}>Accédez à votre espace étudiant GoxLearning</p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={styles.errorBanner}>
              <div style={styles.errorDot}>!</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>Erreur de connexion</div>
                <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>{error}</div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={styles.form}>
            {/* Email */}
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Adresse email</label>
              <div style={styles.inputGroup}>
                <div style={{
                  ...styles.inputIcon,
                  background: focusedField === 'email' ? colors.brand : '#F3F4F6',
                  color: focusedField === 'email' ? '#fff' : '#9CA3AF',
                }}>
                  <Mail size={15} />
                </div>
                <input
                  style={{
                    ...styles.input,
                    paddingLeft: 52,
                    borderColor: focusedField === 'email' ? colors.brand : '#E5E7EB',
                    boxShadow: focusedField === 'email' ? '0 0 0 2px rgba(0,42,161,0.12)' : 'none',
                  }}
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Mot de passe</label>
              <div style={styles.inputGroup}>
                <div style={{
                  ...styles.inputIcon,
                  background: focusedField === 'password' ? colors.brand : '#F3F4F6',
                  color: focusedField === 'password' ? '#fff' : '#9CA3AF',
                }}>
                  <Lock size={15} />
                </div>
                <input
                  style={{
                    ...styles.input,
                    paddingLeft: 52,
                    paddingRight: 44,
                    borderColor: focusedField === 'password' ? colors.brand : '#E5E7EB',
                    boxShadow: focusedField === 'password' ? '0 0 0 2px rgba(0,42,161,0.12)' : 'none',
                  }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                opacity: loading || !email || !password ? 0.5 : 1,
              }}
              disabled={loading || !email || !password}
            >
              {loading ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Security note */}
          <div style={styles.securityNote}>
            <Shield size={12} color="#9CA3AF" />
            <span>Connexion sécurisée via GoxLearning Security</span>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            GoxLearning Academy &copy; {new Date().getFullYear()} &mdash; Tous droits réservés
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  /* ── Layout ── */
  container: {
    display: 'flex',
    height: '100vh',
    background: '#F8F9FB',
  },

  /* ── Left panel ── */
  leftPanel: {
    width: 480,
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
  },
  bgImage: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'url(/login-bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  bgOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 20, 80, 0.45)',
  },
  leftContent: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
    padding: 48,
  },
  leftLogo: {
    height: 40,
    objectFit: 'contain',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: 800,
    color: '#fff',
    lineHeight: 1.2,
    letterSpacing: '-0.5px',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 14,
    lineHeight: 1.6,
    maxWidth: 360,
  },
  pillRow: {
    display: 'flex',
    flexWrap: 'wrap' as any,
    gap: 8,
    marginTop: 28,
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 500,
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.75)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  statsRow: {
    display: 'flex',
    gap: 36,
    marginBottom: 20,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 800,
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },
  leftFooter: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase' as any,
    letterSpacing: 1,
    fontWeight: 500,
  },

  /* ── Right panel ── */
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  formWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  rightLogo: {
    height: 36,
    objectFit: 'contain',
    marginBottom: 36,
    display: 'none',
  },
  welcomeSection: {
    marginBottom: 28,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: colors.brand,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 800,
    color: '#111827',
    letterSpacing: '-0.5px',
  },
  welcomeSub: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 1.5,
  },

  /* ── Error ── */
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 12,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    marginBottom: 20,
    fontSize: 13,
  },
  errorDot: {
    width: 24,
    height: 24,
    borderRadius: 8,
    background: '#dc2626',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },

  /* ── Form ── */
  form: {
    display: 'flex',
    flexDirection: 'column' as any,
    gap: 18,
  },
  fieldWrap: {
    display: 'flex',
    flexDirection: 'column' as any,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: '#9CA3AF',
    textTransform: 'uppercase' as any,
    letterSpacing: 1,
  },
  inputGroup: {
    position: 'relative' as any,
  },
  inputIcon: {
    position: 'absolute' as any,
    left: 0,
    top: 0,
    bottom: 0,
    width: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    transition: 'all 0.2s',
  },
  input: {
    width: '100%',
    height: 48,
    background: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: '0 16px',
    fontSize: 14,
    color: '#111827',
    outline: 'none',
    transition: 'all 0.2s',
  },
  eyeBtn: {
    position: 'absolute' as any,
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9CA3AF',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  submitBtn: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    background: colors.brand,
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.2s',
    marginTop: 4,
  },

  /* ── Footer ── */
  securityNote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 28,
    fontSize: 11,
    color: '#9CA3AF',
  },
  footer: {
    textAlign: 'center' as any,
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 20,
    paddingTop: 20,
    borderTop: '1px solid #F3F4F6',
  },
}
