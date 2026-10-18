import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { type } from '@/theme/typography';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { AuthHero } from '@/components/AuthHero';
import { login } from '@/api/hooks';
import { ApiRequestError, errorMessage } from '@/api/client';
import { useAuth } from '@/store/authStore';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 900;
  const signIn = useAuth((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Un error se borra apenas el usuario corrige ese campo.
  const fix = (key: string) => setErrors(({ [key]: _gone, ...rest }) => rest);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const next: Record<string, string> = {};
    if (!email.trim()) next['email'] = 'Ingresa tu correo';
    if (!password) next['password'] = 'Ingresa tu contraseña';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await signIn(await login({ email: email.trim(), password }));
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 422) setErrors(err.fieldErrors());
      else setFormError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const form = (
    <View style={[s.form, wide && s.formWide]}>
      <TextField
        label="Correo"
        value={email}
        onChangeText={(v) => (setEmail(v), fix('email'))}
        error={errors['email']}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="tu@correo.cl"
        returnKeyType="next"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={(v) => (setPassword(v), fix('password'))}
        error={errors['password']}
        secureTextEntry
        autoComplete="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {formError ? <Text style={s.formError}>{formError}</Text> : null}
      <Button label="Entrar" onPress={submit} loading={loading} forward />
      <View style={s.switchRow}>
        <Text style={s.switchText}>¿Primera vez en Kancha?</Text>
        <Link href="/registro" style={s.link} accessibilityRole="link">
          Crear cuenta
        </Link>
      </View>
    </View>
  );

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
            lines={['Nos', 'falta', 'uno.']}
            size={wide ? 150 : 88}
            caption="Encuentra el partido al que le falta alguien, cerca de ti. Fútbol, pádel o básquet."
          />
        </View>
        {form}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xl, flexGrow: 1 },
  contentWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 96,
    paddingHorizontal: spacing.xxl,
  },
  heroWide: { flexShrink: 1, maxWidth: 560 },
  form: { gap: spacing.md },
  formWide: { width: 400, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card },
  formError: { ...type.caption, fontSize: 13, color: colors.error },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  switchText: { ...type.body, color: colors.textMuted },
  link: { ...type.body, color: colors.accent, paddingVertical: spacing.sm },
});
