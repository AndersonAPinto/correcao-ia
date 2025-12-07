'use client';

import { cn } from "@/lib/utils";
import {
  FileText,
  Award,
  GraduationCap,
  BotIcon,
  BarChart3,
} from "lucide-react";

export function FeaturesSectionWithHoverEffects({ setActiveView }) {
  const features = [
    {
      title: "CorregIA",
      description:
        "Correção automática e instantânea de provas de múltipla escolha. Para questões discursivas, receba sugestões inteligentes de pontuação.",
      icon: <BotIcon className="h-6 w-6" />,
      target: "corretor-ia",
    },
    {
      title: "Gabaritos",
      description:
        "Crie e gerencie gabaritos personalizados para suas avaliações. Suporte para múltipla escolha, discursiva e mista.",
      icon: <FileText className="h-6 w-6" />,
      target: "gabaritos",
    },
    {
      title: "Habilidades",
      description:
        "Identifique e acompanhe o desenvolvimento de habilidades específicas dos alunos através de tags e relatórios detalhados.",
      icon: <Award className="h-6 w-6" />,
      target: "habilidades",
    },
    {
      title: "Perfis de Avaliação",
      description:
        "Configure perfis de correção personalizados com critérios específicos para diferentes tipos de avaliação e disciplinas.",
      icon: <GraduationCap className="h-6 w-6" />,
      target: "perfis",
    },
    {
      title: "Analytics",
      description:
        "Acompanhe o desenvolvimento dos alunos através de métricas e relatórios detalhados.",
      icon: <BarChart3 className="h-6 w-6" />,
      target: "analytics",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-2 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature
          key={feature.title}
          {...feature}
          index={index}
          setActiveView={setActiveView}
        />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
  target,
  setActiveView,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature dark:border-blue-800 cursor-pointer",
        (index === 0 || index === 4) && "lg:border-l dark:border-blue-800",
        index < 4 && "lg:border-b dark:border-blue-950"
      )}
      onClick={() => {
        if (setActiveView) {
          setActiveView(target);
        }
      }}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 dark:from-blue-600 to-transparent pointer-events-none" />

      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 dark:from-blue-600 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-600 dark:text-neutral-400">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-blue-500 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};

