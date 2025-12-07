'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const plans = {
    monthly: [
        {
            name: "Free",
            price: "R$ 0",
            description: "Para professores que querem experimentar.",
            features: [
                "50 correções por mês",
                "1 turma",
                "Gabaritos simples",
                "Suporte por email"
            ],
            cta: "Começar Grátis",
            popular: false,
            period: null
        },
        {
            name: "Pro",
            price: "R$ 49",
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
                "50 correções por mês",
                "1 turma",
                "Gabaritos simples",
                "Suporte por email"
            ],
            cta: "Começar Grátis",
            popular: false,
            period: null
        },
        {
            name: "Pro",
            price: "R$ 39",
            period: "/mês",
            originalPrice: "R$ 49",
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
        <section id="pricing" className="py-20">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold mb-4">Planos simples e transparentes</h2>
                    <p className="text-muted-foreground text-lg">
                        Escolha o plano ideal para sua necessidade. Cancele a qualquer momento.
                    </p>
                </div>

                {/* Toggle Mensal/Anual */}
                <div className="flex items-center justify-center gap-4 mb-5">

                    <Label
                        htmlFor="billing-toggle"
                        className={`text-sm font-medium cursor-pointer ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                        Mensal
                    </Label>
                    <Switch
                        id="billing-toggle"
                        checked={isYearly}
                        onCheckedChange={setIsYearly}
                    />
                    <Label
                        htmlFor="billing-toggle"
                        className={`text-sm font-medium cursor-pointer ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                        Anual
                    </Label>

                </div>
                {/*<div className="flex items-center justify-center gap-4 mb-15">
                    {isYearly && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                            Economize 20%
                        </span>
                    )}
                </div>*/}

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {currentPlans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative rounded-2xl p-8 ${plan.popular
                                ? 'bg-white dark:bg-gray-900 border-2 border-blue-600 shadow-xl'
                                : 'bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                                    Mais Popular
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold">{plan.price}</span>
                                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                                </div>
                                {plan.originalPrice && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-muted-foreground line-through">{plan.originalPrice}/mês</span>
                                    </div>
                                )}
                                {plan.billingPeriod && (
                                    <p className="text-xs text-muted-foreground mt-1">{plan.billingPeriod}</p>
                                )}
                                <p className="text-muted-foreground mt-2">{plan.description}</p>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <Check className="h-5 w-5 text-green-500 shrink-0" />
                                        <span className="text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                className={`w-full h-12 rounded-xl ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''
                                    }`}
                                variant={plan.popular ? 'default' : 'outline'}
                                onClick={onRegisterClick}
                            >
                                {plan.cta}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
