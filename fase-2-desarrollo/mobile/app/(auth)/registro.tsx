import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import type { SportKey } from '@/theme/sports';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { SportPicker } from '@/components/SportPicker';
import { AuthHero } from '@/components/AuthHero';
import { register } from '@/api/hooks';
import { ApiRequestError, errorMessage } from '@/api/client';
import { useAuth } from '@/store/authStore';

/** HU-01 (KAN-7): registro de agente libre con su disciplina favorita. */
export default function RegisterScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 900;
  const signIn = useAuth((s) => s.signIn);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sport, setSport] = useState<SportKey | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Un error se borra apenas el usuario corrige ese campo.
  const fix = (key: string) => setErrors(({ [key]: _gone, ...rest }) => rest);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    // HU-01: los campos vacíos se marcan y el envío se bloquea.
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next['name'] = 'Ingresa tu nombre';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next['email'] = 'Ingresa un correo válido';
    if (password.length < 8) next['password'] = 'La contraseña debe tener al menos 8 caracteres';
    if (!sport) next['favoriteSport'] = 'Elige el deporte que más juegas';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length || !sport) return;

    setLoading(true);
    try {
      await signIn(await register({ name: name.trim(), email: email.trim(), password, favoriteSport: sport }));
    } catch (err) {
      if (err instanceof ApiRequestError && err.apiError.code === 'EMAIL_TAKEN') {
        setErrors({ email: err.message });
      } else if (err instanceof ApiRequestError && err.status === 422) {
        setErrors(err.fieldErrors());
      } else {
        setFormError(errorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          s.content,
          wide && s.contentWide,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={wide ? s.heroWide : undefined}>
          <AuthHero
            lines={['Ponte', 'la', 'camiseta.']}
            size={wide ? 128 : 64}
            caption="Tu perfil parte sin calificaciones: el honor se gana jugando."
          />
        </View>

        <View style={[s.form, wide && s.formWide]}>
          <TextField label="Nombre" value={name} onChangeText={(v) => (setName(v), fix('name'))} error={errors['name']} autoComplete="name" placeholder="Cómo te conocen en la cancha" />
          <TextField
            label="Correo"
            value={email}
            onChangeText={(v) => (setEmail(v), fix('email'))}
            error={errors['email']}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="tu@correo.cl"
          />
          <TextField
            label="Contraseña"
            value={password}
            onChangeText={(v) => (setPassword(v), fix('password'))}
            error={errors['password']}
            hint="Mínimo 8 caracteres"
            secureTextEntry
            autoComplete="new-password"
          />
          <View style={{ gap: 6 }}>
            <Text style={s.question}>¿Qué juegas más?</Text>
            <SportPicker value={sport} onChange={(v) => (setSport(v), fix('favoriteSport'))} error={errors['favoriteSport']} />
          </View>
          {formError ? <Text style={s.formError}>{formError}</Text> : null}
          <Button label="Crear cuenta" onPress={submit} loading={loading} forward />
          <View style={s.switchRow}>
            <Text style={s.switchText}>¿Ya tienes cuenta?</Text>
            <Link href="/login" style={s.link} accessibilityRole="link">
              Entrar
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xl, flexGrow: 1 },
  contentWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 96, paddingHorizontal: spacing.xxl },
  heroWide: { flexShrink: 1, maxWidth: 560 },
  form: { gap: spacing.md },
  formWide: { width: 420, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card },
  question: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  formError: { ...type.caption, fontSize: 13, color: colors.error },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  switchText: { ...type.body, color: colors.textMuted },
  link: { ...type.body, color: colors.accent, paddingVertical: spacing.sm },
});
