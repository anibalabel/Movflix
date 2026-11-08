'use client';

import React, { useState, useEffect } from 'react';
import { PlanRecord, SubscriptionItem } from '@/lib/plan-catalog';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Tv,
  Smartphone,
  ShieldCheck,
  Star,
  RefreshCw,
  Clock,
  Sparkles,
  Search,
  UserPlus,
} from 'lucide-react';

interface PlansAndSubsData {
  plans: PlanRecord[];
  subscriptions: SubscriptionItem[];
}

export default function PlansManagementSection() {
  const [activeTab, setActiveTab] = useState<'plans' | 'subscriptions'>('plans');
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Crear / Editar Plan
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRecord | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Form Fields Plan
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formPrice, setFormPrice] = useState('9.99');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formInterval, setFormInterval] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [formIntervalCount, setFormIntervalCount] = useState(1);
  const [formPackDuration, setFormPackDuration] = useState('30');
  const [formDescription, setFormDescription] = useState('');
  const [formFeatures, setFormFeatures] = useState('HD, 4K Ultra HD, Sin anuncios');
  const [formMaxDevices, setFormMaxDevices] = useState(2);
  const [formMaxProfiles, setFormMaxProfiles] = useState(3);
  const [formTrialDays, setFormTrialDays] = useState(0);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formStripePriceId, setFormStripePriceId] = useState('');
  const [formPaypalPlanId, setFormPaypalPlanId] = useState('');

  // Modal Asignar Suscripción Manual
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subUserId, setSubUserId] = useState('');
  const [subPlanName, setSubPlanName] = useState('Premium');
  const [subDays, setSubDays] = useState('30');
  const [subProvider, setSubProvider] = useState('manual');
  const [savingSub, setSavingSub] = useState(false);
  const [searchSub, setSearchSub] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [plansRes, subsRes] = await Promise.all([
        fetch('/api/admin/plans'),
        fetch('/api/admin/subscriptions'),
      ]);

      const plansJson = await plansRes.json();
      const subsJson = await subsRes.json();

      if (plansJson.success) setPlans(plansJson.data || []);
      if (subsJson.success) setSubscriptions(subsJson.data || []);
    } catch {
      setErrorMsg('No se pudieron cargar los datos de planes y suscripciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewPlanModal = () => {
    setEditingPlan(null);
    setFormName('');
    setFormSlug('');
    setFormPrice('9.99');
    setFormCurrency('USD');
    setFormInterval('month');
    setFormIntervalCount(1);
    setFormPackDuration('30');
    setFormDescription('Acceso ilimitado a todo el catálogo de películas, series y animes en alta definición.');
    setFormFeatures('Full HD y 4K Ultra HD\nSin publicidad\nDescarga en app móvil\nSoporte para Smart TV');
    setFormMaxDevices(2);
    setFormMaxProfiles(3);
    setFormTrialDays(0);
    setFormIsFeatured(false);
    setFormIsActive(true);
    setFormStripePriceId('');
    setFormPaypalPlanId('');
    setPlanModalOpen(true);
  };

  const openEditPlanModal = (plan: PlanRecord) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormSlug(plan.slug);
    setFormPrice(String(plan.price));
    setFormCurrency(plan.currency);
    setFormInterval(plan.interval);
    setFormIntervalCount(plan.interval_count);
    setFormPackDuration(String(plan.pack_duration));
    setFormDescription(plan.description || '');
    setFormFeatures(plan.features.join('\n'));
    setFormMaxDevices(plan.max_devices);
    setFormMaxProfiles(plan.max_profiles);
    setFormTrialDays(plan.trial_days);
    setFormIsFeatured(plan.is_featured);
    setFormIsActive(plan.is_active);
    setFormStripePriceId(plan.stripe_price_id || '');
    setFormPaypalPlanId(plan.paypal_plan_id || '');
    setPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlan(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const featuresArray = formFeatures
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: formName,
      slug: formSlug || undefined,
      price: formPrice,
      currency: formCurrency,
      interval: formInterval,
      interval_count: formIntervalCount,
      pack_duration: formPackDuration,
      description: formDescription,
      features: featuresArray,
      max_devices: formMaxDevices,
      max_profiles: formMaxProfiles,
      trial_days: formTrialDays,
      is_featured: formIsFeatured,
      is_active: formIsActive,
      stripe_price_id: formStripePriceId || null,
      paypal_plan_id: formPaypalPlanId || null,
    };

    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(editingPlan ? 'Plan actualizado con éxito.' : 'Plan creado con éxito.');
        setPlanModalOpen(false);
        loadData();
      } else {
        setErrorMsg(data.error || 'Ocurrió un error al guardar el plan.');
      }
    } catch {
      setErrorMsg('Error de red al guardar el plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (plan: PlanRecord) => {
    if (!window.confirm(`¿Estás seguro de eliminar el plan "${plan.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Plan eliminado.');
        loadData();
      } else {
        setErrorMsg(data.error || 'No se pudo eliminar el plan.');
      }
    } catch {
      setErrorMsg('Error de red al eliminar el plan.');
    }
  };

  const handleCreateManualSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSub(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(subUserId),
          name: subPlanName,
          days: Number(subDays),
          provider: subProvider,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Suscripción asignada al usuario correctamente.');
        setSubModalOpen(false);
        setSubUserId('');
        loadData();
      } else {
        setErrorMsg(data.error || 'No se pudo asignar la suscripción.');
      }
    } catch {
      setErrorMsg('Error de red al asignar suscripción.');
    } finally {
      setSavingSub(false);
    }
  };

  const handleDeleteSubscription = async (sub: SubscriptionItem) => {
    if (!window.confirm(`¿Cancelar la suscripción #${sub.id} del usuario ${sub.user_name}?`)) return;

    try {
      const res = await fetch(`/api/admin/subscriptions/${sub.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Suscripción eliminada/cancelada.');
        loadData();
      } else {
        setErrorMsg(data.error || 'No se pudo cancelar la suscripción.');
      }
    } catch {
      setErrorMsg('Error de red al cancelar la suscripción.');
    }
  };

  const filteredSubs = subscriptions.filter(
    (s) =>
      s.user_name?.toLowerCase().includes(searchSub.toLowerCase()) ||
      s.user_email?.toLowerCase().includes(searchSub.toLowerCase()) ||
      String(s.user_id).includes(searchSub) ||
      s.name.toLowerCase().includes(searchSub.toLowerCase())
  );

  return (
    <section className="space-y-6 pt-4">
      {/* Header Panel */}
      <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Módulo de Planes y Suscripciones
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  EasyPlex / Cashier
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Administra planes de membresía, pasarelas de pago y suscripciones activas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Recargar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {activeTab === 'plans' ? (
              <button
                type="button"
                onClick={openNewPlanModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-600/25 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Plan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSubModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-amber-600/25 transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Asignar Suscripción</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'plans'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Catálogo de Planes ({plans.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'subscriptions'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Suscripciones de Usuarios ({subscriptions.length})</span>
          </button>
        </div>

        {/* TAB 1: CATÁLOGO DE PLANES */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            {plans.length === 0 ? (
              <div className="rounded-2xl bg-zinc-950/50 border border-zinc-800/80 p-12 text-center space-y-4">
                <CreditCard className="w-12 h-12 text-zinc-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">No hay planes creados aún</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Crea planes de suscripción para que tus usuarios puedan adquirirlos desde la web y apps móviles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewPlanModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Primer Plan</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl p-6 flex flex-col justify-between border transition-all duration-200 ${
                      plan.is_featured
                        ? 'bg-gradient-to-b from-red-950/40 via-zinc-900 to-zinc-950 border-red-500/50 shadow-xl shadow-red-600/10'
                        : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    {plan.is_featured && (
                      <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                        Destacado
                      </span>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black text-white">{plan.name}</h3>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                plan.is_active ? 'bg-emerald-500' : 'bg-zinc-600'
                              }`}
                              title={plan.is_active ? 'Activo' : 'Inactivo'}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-zinc-400">/{plan.slug}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-2xl font-black text-white">
                            {plan.formatted_price}
                          </span>
                          <span className="block text-[10px] text-zinc-400 uppercase font-semibold">
                            {plan.interval_label}
                          </span>
                        </div>
                      </div>

                      {plan.description && (
                        <p className="text-xs text-zinc-300 line-clamp-2">{plan.description}</p>
                      )}

                      {/* Device & Profile Badges */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 px-2.5 py-1.5 text-zinc-300">
                          <Smartphone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{plan.max_devices} Disp. máx</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 px-2.5 py-1.5 text-zinc-300">
                          <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>{plan.max_profiles} Perfiles</span>
                        </div>
                      </div>

                      {/* Features */}
                      {plan.features.length > 0 && (
                        <ul className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs text-zinc-300">
                          {plan.features.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">{f}</span>
                            </li>
                          ))}
                          {plan.features.length > 4 && (
                            <li className="text-[11px] text-zinc-500 pl-5.5">
                              +{plan.features.length - 4} características adicionales
                            </li>
                          )}
                        </ul>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-5 mt-4 border-t border-zinc-800/80">
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                        {plan.has_stripe && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold">
                            Stripe
                          </span>
                        )}
                        {plan.has_paypal && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                            PayPal
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditPlanModal(plan)}
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                          title="Editar Plan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan)}
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-red-600/20 text-zinc-300 hover:text-red-400 border border-transparent hover:border-red-500/30 transition cursor-pointer"
                          title="Eliminar Plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SUSCRIPCIONES DE USUARIOS */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchSub}
                  onChange={(e) => setSearchSub(e.target.value)}
                  placeholder="Buscar usuario o email..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="text-xs text-zinc-400">
                Mostrando <strong>{filteredSubs.length}</strong> de {subscriptions.length} suscripciones
              </div>
            </div>

            {filteredSubs.length === 0 ? (
              <div className="rounded-2xl bg-zinc-950/50 border border-zinc-800/80 p-12 text-center space-y-3">
                <Users className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-sm font-semibold text-zinc-300">
                  No se encontraron suscripciones registradas.
                </p>
                <button
                  type="button"
                  onClick={() => setSubModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Asignar suscripción a un usuario</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/90 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">ID / Usuario</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Inicio</th>
                      <th className="px-4 py-3">Vence</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredSubs.map((s) => (
                      <tr key={s.id} className="hover:bg-zinc-900/40 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {String(s.user_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white truncate max-w-[140px]">
                                {s.user_name}
                              </div>
                              <div className="text-[11px] text-zinc-400 truncate max-w-[160px]">
                                {s.user_email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-zinc-200">{s.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {s.provider}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.is_active
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/15 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {s.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {s.status_label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {s.current_period_start
                            ? new Date(s.current_period_start).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-zinc-300 font-medium">
                          {s.ends_at ? new Date(s.ends_at).toLocaleDateString() : 'Indefinida'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteSubscription(s)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-600/20 text-zinc-400 hover:text-red-400 transition"
                            title="Cancelar / Quitar suscripción"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: CREAR / EDITAR PLAN */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/15 text-red-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Se sincronizará en la base de datos y en storage/app/plan-craft/plans.json
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlanModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nombre del Plan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej: Premium 4K"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Slug / Identificador
                  </label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="premium-4k (autogenerado si se deja vacío)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Precio *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="9.99"
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Moneda</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="MXN">MXN ($)</option>
                    <option value="COP">COP ($)</option>
                    <option value="ARS">ARS ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Periodo</label>
                  <select
                    value={formInterval}
                    onChange={(e) => setFormInterval(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="day">Días</option>
                    <option value="week">Semanas</option>
                    <option value="month">Meses</option>
                    <option value="year">Años</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Duración (Días)
                  </label>
                  <input
                    type="number"
                    value={formPackDuration}
                    onChange={(e) => setFormPackDuration(e.target.value)}
                    placeholder="30"
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Dispositivos simultáneos
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formMaxDevices}
                    onChange={(e) => setFormMaxDevices(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Perfiles máximos
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formMaxProfiles}
                    onChange={(e) => setFormMaxProfiles(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Días de prueba gratis
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formTrialDays}
                    onChange={(e) => setFormTrialDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detalles sobre lo que incluye el plan..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Características (Una por línea)
                </label>
                <textarea
                  rows={3}
                  value={formFeatures}
                  onChange={(e) => setFormFeatures(e.target.value)}
                  placeholder="Full HD / 4K&#10;Sin publicidad&#10;Descargas offline"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Pasarelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Stripe Price ID o Payment Link (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formStripePriceId}
                    onChange={(e) => setFormStripePriceId(e.target.value)}
                    placeholder="price_1Nxxxxxxxxxx o plink_1Uxxxxxxxxxx"
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200"
                  />
                  <span className="block text-[10px] text-zinc-500 mt-1">
                    Acepta un Price ID (price_...) o enlace directo de pago de Stripe (plink_...).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    PayPal Plan ID (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formPaypalPlanId}
                    onChange={(e) => setFormPaypalPlanId(e.target.value)}
                    placeholder="P-xxxxxxxxxx"
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-0"
                  />
                  <span>Destacar como Recomendado</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-0"
                  />
                  <span>Plan Activo (Visible)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-600/25 transition cursor-pointer"
                >
                  {savingPlan ? 'Guardando...' : editingPlan ? 'Actualizar Plan' : 'Crear Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASIGNAR SUSCRIPCIÓN MANUAL A USUARIO */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Asignar Suscripción</h3>
                  <p className="text-xs text-zinc-400">
                    Otorga acceso premium a un usuario específico
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualSubscription} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  ID de Usuario (users.id) *
                </label>
                <input
                  type="number"
                  required
                  value={subUserId}
                  onChange={(e) => setSubUserId(e.target.value)}
                  placeholder="Ej: 1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Plan de Membresía
                </label>
                <select
                  value={subPlanName}
                  onChange={(e) => setSubPlanName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {plans.length > 0 ? (
                    plans.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.formatted_price} / {p.interval_label})
                      </option>
                    ))
                  ) : (
                    <option value="Premium">Premium</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Duración (Días)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={subDays}
                    onChange={(e) => setSubDays(e.target.value)}
                    placeholder="30"
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Método</label>
                  <select
                    value={subProvider}
                    onChange={(e) => setSubProvider(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
                  >
                    <option value="manual">Manual (Admin)</option>
                    <option value="offline">Transferencia / Efectivo</option>
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSubModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSub}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-amber-600/25 transition cursor-pointer"
                >
                  {savingSub ? 'Asignando...' : 'Asignar Suscripción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

