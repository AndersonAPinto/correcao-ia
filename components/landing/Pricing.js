'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const plans = {
    monthly: [
        {
            name: "Free",
            price: "R$ 0",
            description: "Para professores que querem experimentar.",
            features: [
                "20 correções por mês",
                "1 turma",
                "Gabaritos simples",
                "7 dias de teste"
            ],
            cta: "Começar Grátis",
            popular: false,
            period: null
        },
        {
            name: "Pro",
            price: "R$ 79",
            period: "/mês",
            description: "Para escolas e professores com muitas turmas.",
            features: [
                "Correções ilimitadas",
                "Turmas ilimitadas",
                "Analytics avançado",
                "Exportação para Excel/CSV",
                "Suporte prioritário"
            ],
            cta: "Assinar Agora",
            popular: true
        }
    ],
    yearly: [
        {
            name: "Free",
            price: "R$ 0",
            description: "Para professores que querem experimentar.",
            features: [
                "20 correções por mês",
                "1 turma",
                "Gabaritos simples",
                "7 dias de teste"
            ],
            cta: "Começar Grátis",
            popular: false,
            period: null
        },
        {
            name: "Pro",
            price: "R$ 59",
            period: "/mês",
            originalPrice: "R$ 79",
            description: "Para escolas e professores com muitas turmas.",
            features: [
                "Correções ilimitadas",
                "Turmas ilimitadas",
                "Analytics avançado",
                "Exportação para Excel/CSV",
                "Suporte prioritário",
                "Economia de 20% no plano anual"
            ],
            cta: "Assinar Agora",
            popular: true,
            billingPeriod: "Cobrado anualmente (R$ 468/ano)"
        }
    ]
};

export default function Pricing({ onRegisterClick }) {
    const [isYearly, setIsYearly] = useState(false);
    const currentPlans = isYearly ? plans.yearly : plans.monthly;

    return (
        <section id="pricing" className="py-24 bg-slate-900 text-white">
            <div className="container max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 text-white leading-tight">Planos simples e transparentes</h2>
                    <p className="text-slate-400 text-xl font-medium">
                        Escolha o plano ideal para sua necessidade. Cancele a qualquer momento.
                    </p>
                </div>

                {/* Toggle Mensal/Anual */}
                <div className="flex items-center justify-center gap-6 mb-16">
                    <span className={`text-base font-bold ${!isYearly ? 'text-white' : 'text-slate-500'}`}>Mensal</span>
                    <Switch
                        id="billing-toggle"
                        checked={isYearly}
                        onCheckedChange={setIsYearly}
                        className="data-[state=checked]:bg-emerald-500"
                    />
                    <div className="flex items-center gap-2">
                        <span className={`text-base font-bold ${isYearly ? 'text-white' : 'text-slate-500'}`}>Anual</span>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-500/20">
                            -20% OFF
                        </span>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {currentPlans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative rounded-3xl p-10 transition-all duration-500 flex flex-col ${plan.popular
                                ? 'bg-white text-slate-900 shadow-2xl lg:scale-105 z-10'
                                : 'bg-white/[0.03] backdrop-blur-md border border-white/5 text-white hover:bg-white/[0.06]'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                                    Mais Popular
                                </div>
                            )}

                            <div className="mb-10">
                                <h3 className={`text-2xl font-bold mb-4 ${plan.popular ? 'text-slate-900' : 'text-white'}`}>{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-5xl font-extrabold tracking-tight">{plan.price}</span>
                                    {plan.period && <span className={`${plan.popular ? 'text-slate-500' : 'text-slate-400'} text-lg font-medium`}>{plan.period}</span>}
                                </div>
                                {plan.billingPeriod && (
                                    <p className={`text-sm font-semibold mb-4 ${plan.popular ? 'text-emerald-600' : 'text-emerald-400'}`}>{plan.billingPeriod}</p>
                                )}
                                <p className={`text-lg font-medium leading-relaxed ${plan.popular ? 'text-slate-600' : 'text-slate-400'}`}>{plan.description}</p>
                            </div>

                            <ul className="space-y-4 mb-10 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${plan.popular ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                        </div>
                                        <span className={`text-base font-medium ${plan.popular ? 'text-slate-700' : 'text-slate-300'}`}>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                className={`w-full h-14 rounded-2xl text-lg font-bold transition-all transform hover:scale-[1.02] active:scale-95 ${plan.popular
                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20'
                                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                                    }`}
                                onClick={onRegisterClick}
                            >
                                {plan.cta}
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="mt-24 text-center">
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-12 max-w-4xl mx-auto backdrop-blur-sm">
                        <h3 className="text-3xl lg:text-4xl font-extrabold mb-4 text-white">Pronto para transformar sua rotina?</h3>
                        <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto font-medium">
                            Junte-se a centenas de professores que já economizam tempo e melhoram o feedback de seus alunos com o CorregIA.
                        </p>
                        <Button
                            size="lg"
                            className="h-14 px-12 text-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-500/20 transition-all transform hover:scale-105 active:scale-95"
                            onClick={onRegisterClick}
                        >
                            Criar Minha Conta Grátis
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
