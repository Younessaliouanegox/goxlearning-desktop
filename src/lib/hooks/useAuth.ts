import { useState, useEffect } from 'react'
import { supabase, supabaseAuth } from '../supabase'
import { Session } from '@supabase/supabase-js'
import type { Student } from '../../types'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabaseAuth.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchUserProfile(session.user.id, session.user.email || '')
      else setLoading(false)
    })

    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) fetchUserProfile(session.user.id, session.user.email || '')
      else {
        setStudent(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string, email: string) => {
    console.log('[AUTH] Fetching profile for userId:', userId, 'email:', email)

    // Try students table by ID first
    const { data: studentById, error: errById } = await supabase
      .from('students')
      .select('id, name, email, phone, status, avatar_url')
      .eq('id', userId)
      .maybeSingle()

    console.log('[AUTH] Student by ID:', studentById, errById?.message)

    if (studentById) {
      setStudent({ ...studentById, avatar_url: studentById.avatar_url || null })
      setLoading(false)
      return
    }

    // Try students table by email
    if (email) {
      const { data: studentByEmail, error: errByEmail } = await supabase
        .from('students')
        .select('id, name, email, phone, status, avatar_url')
        .eq('email', email)
        .maybeSingle()

      console.log('[AUTH] Student by email:', studentByEmail, errByEmail?.message)

      if (studentByEmail) {
        setStudent({ ...studentByEmail, avatar_url: studentByEmail.avatar_url || null })
        setLoading(false)
        return
      }
    }

    // Try members table by ID (admin, instructor, support, etc.)
    const { data: memberById, error: errMemberById } = await supabase
      .from('members')
      .select('id, name, email, phone, role, status, avatar_url')
      .eq('id', userId)
      .maybeSingle()

    console.log('[AUTH] Member by ID:', memberById, errMemberById?.message)

    if (memberById) {
      setStudent({
        id: memberById.id,
        name: memberById.name,
        email: memberById.email,
        phone: memberById.phone,
        status: memberById.status || 'Actif',
        role: memberById.role || 'member',
        avatar_url: memberById.avatar_url || null,
      })
      setLoading(false)
      return
    }

    // Try members table by email
    if (email) {
      const { data: memberByEmail, error: errMemberByEmail } = await supabase
        .from('members')
        .select('id, name, email, phone, role, status, avatar_url')
        .eq('email', email)
        .maybeSingle()

      console.log('[AUTH] Member by email:', memberByEmail, errMemberByEmail?.message)

      if (memberByEmail) {
        setStudent({
          id: memberByEmail.id,
          name: memberByEmail.name,
          email: memberByEmail.email,
          phone: memberByEmail.phone,
          status: memberByEmail.status || 'Actif',
          role: memberByEmail.role || 'member',
          avatar_url: memberByEmail.avatar_url || null,
        })
        setLoading(false)
        return
      }
    }

    // Fallback: use auth metadata
    console.log('[AUTH] No profile found, using fallback')
    setStudent({
      id: userId,
      name: email.split('@')[0],
      email: email,
      phone: null,
      status: 'Active',
    })
    setLoading(false)
  }

  const signOut = async () => {
    await supabaseAuth.auth.signOut()
    setSession(null)
    setStudent(null)
  }

  return { session, student, loading, signOut }
}
