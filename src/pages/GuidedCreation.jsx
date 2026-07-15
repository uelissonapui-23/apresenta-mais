import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const FALLBACK_PREFIX = 'fallback-';
const FALLBACK_STORAGE_PREFIX = 'apresenta-guided-draft:';

const FALLBACK_QUESTIONS = [
  {
    id: 'fallback-theme',
    question_text: 'Qual é o tema principal?',
    help_text: 'Escreva o assunto central da apresentação em uma frase clara.',
    field_type: 'text',
    required: true,
    order_index: 1,
    destination_field: 'main_theme',
  },
  {
    id: 'fallback-message',
    question_text: 'Qual mensagem o público deve guardar?',
    help_text: 'Defina a ideia mais importante que deve permanecer depois da apresentação.',
    field_type: 'textarea',
    required: true,
    order_index: 2,
    destination_field: 'main_message',
  },
  {
    id: 'fallback-introduction',
    question_text: 'Como você pretende começar?',
    help_text: 'Pode ser uma pergunta, história, dado, situação ou explicação curta.',
    field_type: 'textarea',
    required: false,
    order_index: 3,
    block_type_to_generate: 'section',
    generated_title: 'Introdução',
  },
  {
    id: 'fallback-points',
    question_text: 'Quais são os pontos principais?',
    help_text: 'Escreva um ponto por linha. Você poderá mudar a ordem no editor.',
    field_type: 'textarea',
    required: true,
    order_index: 4,
    block_type_to_generate: 'topic',
    split_lines: true,
  },
  {
    id: 'fallback-examples',
    question_text: 'Existe alguma história, exemplo ou ilustração importante?',
    help_text: 'Esta parte é opcional e poderá ser reposicionada no editor.',
    field_type: 'textarea',
    required: false,
    order_index: 5,
    block_type_to_generate: 'example',
    generated_title: 'Exemplo ou ilustração',
  },
  {
    id: 'fallback-application',
    question_text: 'Qual aplicação prática você deseja propor?',
    help_text: 'O que o público poderá pensar, decidir ou fazer depois?',
    field_type: 'textarea',
    required: false,
    order_index: 6,
    block_type_to_generate: 'application',
    generated_title: 'Aplicação',
  },
  {
    id: 'fallback-conclusion',
    question_text: 'Como você deseja concluir?',
    help_text: 'Resuma a mensagem e defina a forma de encerramento.',
    field_type: 'textarea',
    required: false,
    order_index: 7,
    block_type_to_generate: 'conclusion',
    generated_title: 'Conclusão',
  },
];

function safeJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeCode(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeOptions(rawOptions) {
  if (!rawOptions) return [];

  if (Array.isArray(rawOptions)) {
    return rawOptions
      .map((option) => {
        if (typeof option === 'string') {
          return { label: option, value: option };
        }

        return {
          label: option.label || option.name || option.value,
          value: String(option.value ?? option.id ?? option.label ?? option.name),
        };
      })
      .filter((option) => option.label && option.value);
  }

  const parsed = safeJson(rawOptions);
  if (parsed) return normalizeOptions(parsed);

  return String(rawOptions)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ({ label: item, value: item }));
}

function hasAnswer(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return true;
  return String(value ?? '').trim().length > 0;
}

function compareCondition(actual, operator, expected) {
  const normalizedOperator = normalizeCode(operator || 'equals');

  if (normalizedOperator === 'exists') return hasAnswer(actual);
  if (normalizedOperator === 'not_exists') return !hasAnswer(actual);

  if (Array.isArray(actual)) {
    if (normalizedOperator === 'contains') return actual.map(String).includes(String(expected));
    if (normalizedOperator === 'not_contains') return !actual.map(String).includes(String(expected));
  }

  const actualText = normalizeText(actual);
  const expectedText = normalizeText(expected);

  switch (normalizedOperator) {
    case 'not_equals':
    case 'different':
      return actualText !== expectedText;
    case 'contains':
      return actualText.includes(expectedText);
    case 'not_contains':
      return !actualText.includes(expectedText);
    case 'greater_than':
      return Number(actual) > Number(expected);
    case 'less_than':
      return Number(actual) < Number(expected);
    case 'equals':
    default:
      return actualText === expectedText;
  }
}

function evaluateRule(ruleValue, answers) {
  const rule = safeJson(ruleValue, ruleValue);
  if (!rule || typeof rule !== 'object') return true;

  if (Array.isArray(rule.all)) {
    return rule.all.every((item) => evaluateRule(item, answers));
  }

  if (Array.isArray(rule.any)) {
    return rule.any.some((item) => evaluateRule(item, answers));
  }

  const questionId = rule.question_id || rule.questionId || rule.field || rule.depends_on;
  if (!questionId) return true;

  return compareCondition(
    answers[questionId],
    rule.operator || (Object.prototype.hasOwnProperty.call(rule, 'equals') ? 'equals' : 'equals'),
    Object.prototype.hasOwnProperty.call(rule, 'value') ? rule.value : rule.equals,
  );
}

function scoreFlow(flow, presentation) {
  let score = Number(flow.version || 0) / 1000;

  const checks = [
    ['presentation_type_id', 100],
    ['objective_id', 20],
    ['communication_style_id', 5],
  ];

  for (const [field, weight] of checks) {
    const flowValue = flow[field];
    const presentationValue = presentation[field];

    if (flowValue && presentationValue && flowValue !== presentationValue) {
      return -1;
    }

    if (flowValue && flowValue === presentationValue) score += weight;
    if (!flowValue) score += 0.1;
  }

  return score;
}

function selectBestFlow(flows, presentation) {
  return [...(flows || [])]
    .map((flow) => ({ flow, score: scoreFlow(flow, presentation) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)[0]?.flow || null;
}

function LoadingState() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm">Preparando o guia...</span>
      </div>
    </div>
  );
}

function QuestionField({ question, value, onChange }) {
  const fieldType = normalizeCode(question.field_type || 'textarea');
  const options = normalizeOptions(question.options_json);
  const commonPlaceholder = question.placeholder || 'Digite sua resposta...';

  if (fieldType === 'select' || fieldType === 'single_select') {
    return (
      <Select value={String(value || '')} onValueChange={onChange}>
        <SelectTrigger className="min-h-11 w-full">
          <SelectValue placeholder="Selecione uma opção" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (fieldType === 'radio') {
    return (
      <RadioGroup
        value={String(value || '')}
        onValueChange={onChange}
        className="grid gap-3"
      >
        {options.map((option) => (
          <Label
            key={option.value}
            htmlFor={`${question.id}-${option.value}`}
            className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50"
          >
            <RadioGroupItem id={`${question.id}-${option.value}`} value={option.value} />
            <span className="font-normal">{option.label}</span>
          </Label>
        ))}
      </RadioGroup>
    );
  }

  if (fieldType === 'multi_select' || fieldType === 'multiselect' || fieldType === 'checkboxes') {
    const selected = Array.isArray(value) ? value.map(String) : [];

    return (
      <div className="grid gap-3">
        {options.map((option) => {
          const checked = selected.includes(option.value);

          return (
            <Label
              key={option.value}
              htmlFor={`${question.id}-${option.value}`}
              className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <Checkbox
                id={`${question.id}-${option.value}`}
                checked={checked}
                onCheckedChange={(nextChecked) => {
                  onChange(
                    nextChecked
                      ? [...selected, option.value]
                      : selected.filter((item) => item !== option.value),
                  );
                }}
              />
              <span className="font-normal">{option.label}</span>
            </Label>
          );
        })}
      </div>
    );
  }

  if (fieldType === 'boolean' || fieldType === 'yes_no') {
    return (
      <RadioGroup
        value={value === true ? 'true' : value === false ? 'false' : ''}
        onValueChange={(nextValue) => onChange(nextValue === 'true')}
        className="grid gap-3 sm:grid-cols-2"
      >
        <Label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 hover:bg-muted/50">
          <RadioGroupItem value="true" />
          <span className="font-normal">Sim</span>
        </Label>
        <Label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 hover:bg-muted/50">
          <RadioGroupItem value="false" />
          <span className="font-normal">Não</span>
        </Label>
      </RadioGroup>
    );
  }

  if (fieldType === 'number') {
    return (
      <Input
        type="number"
        min={0}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={commonPlaceholder}
        className="min-h-11"
      />
    );
  }

  if (fieldType === 'text' || fieldType === 'short_text') {
    return (
      <Input
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={commonPlaceholder}
        className="min-h-11"
        autoFocus
      />
    );
  }

  return (
    <Textarea
      rows={7}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={commonPlaceholder}
      className="min-h-44 resize-y"
      autoFocus
    />
  );
}

export default function GuidedCreation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: userLoading } = useCurrentUser();

  const [presentation, setPresentation] = useState(null);
  const [flow, setFlow] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [savedAnswers, setSavedAnswers] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);

  const storageKey = `${FALLBACK_STORAGE_PREFIX}${id}`;

  const loadPage = useCallback(async () => {
    if (!id || userLoading) return;

    if (!user?.id) {
      setError('Sua sessão não está disponível. Entre novamente para continuar.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const presentationData = await base44.entities.Presentation.get(id);

      if (!presentationData || presentationData.user_id !== user.id) {
        throw new Error('Apresentação não encontrada ou sem permissão de acesso.');
      }

      setPresentation(presentationData);

      const allActiveFlows = await base44.entities.GuidedFlow.filter(
        { active: true },
        '-version',
      );
      const selectedFlow = selectBestFlow(allActiveFlows, presentationData);
      setFlow(selectedFlow);

      let questionRows = [];
      if (selectedFlow?.id) {
        questionRows = await base44.entities.GuidedQuestion.filter(
          { guided_flow_id: selectedFlow.id, active: true },
          'order_index',
        );
      }

      const effectiveQuestions = questionRows?.length
        ? questionRows
        : FALLBACK_QUESTIONS;
      setQuestions(effectiveQuestions);

      const usingFallback = !questionRows?.length;
      const existingAnswers = usingFallback
        ? []
        : await base44.entities.GuidedAnswer.filter({ presentation_id: id });

      setSavedAnswers(existingAnswers || []);

      const answerMap = {};
      (existingAnswers || []).forEach((item) => {
        const jsonValue = safeJson(item.answer_json);
        answerMap[item.guided_question_id] = jsonValue ?? item.answer_text ?? '';
      });

      if (usingFallback) {
        const localDraft = safeJson(window.localStorage.getItem(storageKey), {});
        Object.assign(answerMap, localDraft || {});
      }

      effectiveQuestions.forEach((question) => {
        if (answerMap[question.id] !== undefined) return;
        if (question.destination_field && presentationData[question.destination_field] !== undefined) {
          answerMap[question.id] = presentationData[question.destination_field];
        }
      });

      setAnswers(answerMap);
      setCurrentStep(0);
    } catch (pageError) {
      console.error('Erro ao carregar criação guiada:', pageError);
      setError(pageError.message || 'Não foi possível abrir a criação guiada.');
    } finally {
      setLoading(false);
    }
  }, [id, storageKey, user?.id, userLoading]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const visibleQuestions = useMemo(
    () => questions.filter((question) => evaluateRule(question.conditional_rule_json, answers)),
    [answers, questions],
  );

  useEffect(() => {
    if (visibleQuestions.length === 0) {
      setCurrentStep(0);
      return;
    }
    if (currentStep > visibleQuestions.length - 1) {
      setCurrentStep(visibleQuestions.length - 1);
    }
  }, [currentStep, visibleQuestions.length]);

  const currentQuestion = visibleQuestions[currentStep];
  const isLastStep = currentStep === visibleQuestions.length - 1;
  const progress = visibleQuestions.length
    ? Math.round(((currentStep + 1) / visibleQuestions.length) * 100)
    : 0;

  const answeredCount = useMemo(
    () => visibleQuestions.filter((question) => hasAnswer(answers[question.id])).length,
    [answers, visibleQuestions],
  );

  const updateAnswer = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const validateCurrent = () => {
    if (!currentQuestion?.required) return true;

    if (!hasAnswer(answers[currentQuestion.id])) {
      toast({
        title: 'Resposta necessária',
        description: 'Responda esta pergunta antes de continuar.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const saveAnswers = async ({ showToast = false } = {}) => {
    if (!id || !presentation) return;

    setSaving(true);

    try {
      const realQuestions = questions.filter(
        (question) => !String(question.id).startsWith(FALLBACK_PREFIX),
      );
      const existingByQuestion = Object.fromEntries(
        savedAnswers.map((item) => [item.guided_question_id, item]),
      );
      const storedRows = [...savedAnswers];

      for (const question of realQuestions) {
        const value = answers[question.id];
        const existing = existingByQuestion[question.id];

        if (!hasAnswer(value)) {
          if (existing?.id) {
            await base44.entities.GuidedAnswer.delete(existing.id);
            const index = storedRows.findIndex((item) => item.id === existing.id);
            if (index >= 0) storedRows.splice(index, 1);
          }
          continue;
        }

        const payload = {
          presentation_id: id,
          guided_question_id: question.id,
          answer_text: Array.isArray(value) ? value.join('\n') : String(value),
          answer_json: Array.isArray(value) || typeof value === 'boolean'
            ? JSON.stringify(value)
            : '',
        };

        if (existing?.id) {
          const updated = await base44.entities.GuidedAnswer.update(existing.id, payload);
          const index = storedRows.findIndex((item) => item.id === existing.id);
          if (index >= 0) storedRows[index] = updated || { ...existing, ...payload };
        } else {
          const created = await base44.entities.GuidedAnswer.create(payload);
          if (created) storedRows.push(created);
        }
      }

      const fallbackDraft = {};
      questions
        .filter((question) => String(question.id).startsWith(FALLBACK_PREFIX))
        .forEach((question) => {
          if (hasAnswer(answers[question.id])) fallbackDraft[question.id] = answers[question.id];
        });

      if (Object.keys(fallbackDraft).length > 0) {
        window.localStorage.setItem(storageKey, JSON.stringify(fallbackDraft));
      }

      const presentationUpdates = {};
      questions.forEach((question) => {
        const value = answers[question.id];
        if (!question.destination_field || !hasAnswer(value)) return;

        if (question.destination_field === 'estimated_duration_minutes') {
          presentationUpdates[question.destination_field] = Number(value) || 0;
        } else {
          presentationUpdates[question.destination_field] = Array.isArray(value)
            ? value.join(', ')
            : value;
        }
      });

      if (Object.keys(presentationUpdates).length > 0) {
        await base44.entities.Presentation.update(id, presentationUpdates);
        setPresentation((current) => ({ ...current, ...presentationUpdates }));
      }

      setSavedAnswers(storedRows);
      if (showToast) toast({ title: 'Rascunho salvo' });
    } catch (saveError) {
      console.error('Erro ao salvar respostas:', saveError);
      toast({
        title: 'Não foi possível salvar',
        description: 'Suas respostas continuam nesta tela. Tente novamente.',
        variant: 'destructive',
      });
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const buildBlocks = (blockTypes) => {
    const typeByCode = {};
    blockTypes.forEach((item) => {
      typeByCode[normalizeCode(item.code)] = item;
      typeByCode[normalizeCode(item.name)] = item;
    });

    const defaultType = typeByCode.topic || typeByCode.topico || typeByCode.section || blockTypes[0];
    const blocks = [];
    let orderIndex = 0;

    visibleQuestions.forEach((question) => {
      const rawValue = answers[question.id];
      if (!hasAnswer(rawValue) || !question.block_type_to_generate) return;

      const requestedCode = normalizeCode(question.block_type_to_generate);
      const blockType = typeByCode[requestedCode] || defaultType;
      if (!blockType) return;

      const stringValue = Array.isArray(rawValue)
        ? rawValue.join('\n')
        : String(rawValue).trim();

      const shouldSplitLines = Boolean(question.split_lines)
        || ['topic', 'topico', 'subtopic', 'subtopico'].includes(requestedCode);
      const lines = shouldSplitLines
        ? stringValue.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
        : [stringValue];

      lines.forEach((line) => {
        const generatedTitle = question.generated_title
          || question.question_short_title
          || (requestedCode === 'conclusion' ? 'Conclusão' : null)
          || (requestedCode === 'application' || requestedCode === 'aplicacao' ? 'Aplicação' : null)
          || (requestedCode === 'section' || requestedCode === 'secao' ? question.question_text : null)
          || line;
        const titleUsesLine = shouldSplitLines || lines.length > 1;

        blocks.push({
          presentation_id: id,
          parent_id: null,
          block_type_id: blockType.id,
          title: titleUsesLine ? line : generatedTitle,
          summary: '',
          content: titleUsesLine ? '' : line,
          additional_content: '',
          presenter_notes: '',
          order_index: orderIndex,
          depth_level: 0,
          importance_level: question.required ? 5 : 3,
          estimated_duration_seconds: 180,
          is_essential: Boolean(question.required),
          is_hidden: false,
          is_collapsed: false,
          show_to_audience: true,
          icon: '',
          background_style: '',
          text_style: '',
        });

        orderIndex += 1;
      });
    });

    if (blocks.length === 0 && defaultType?.id) {
      blocks.push({
        presentation_id: id,
        parent_id: null,
        block_type_id: defaultType.id,
        title: presentation?.main_theme || presentation?.title || 'Primeiro tópico',
        summary: presentation?.main_message || '',
        content: '',
        additional_content: '',
        presenter_notes: '',
        order_index: 0,
        depth_level: 0,
        importance_level: 5,
        estimated_duration_seconds: 180,
        is_essential: true,
        is_hidden: false,
        is_collapsed: false,
        show_to_audience: true,
        icon: '',
        background_style: '',
        text_style: '',
      });
    }

    return blocks;
  };

  const createGeneratedBlocks = async ({ replaceExisting = false } = {}) => {
    setGenerating(true);

    try {
      await saveAnswers();

      const existingBlocks = await base44.entities.PresentationBlock.filter({ presentation_id: id });
      if (existingBlocks?.length > 0 && !replaceExisting) {
        setReplaceDialogOpen(true);
        return;
      }

      const blockTypes = await base44.entities.BlockType.filter({ active: true }, 'order_index');
      const blocks = buildBlocks(blockTypes || []);

      if (!blocks.length) {
        throw new Error('Nenhum tipo de bloco ativo foi encontrado.');
      }

      let removedBlocksBackup = [];

      if (replaceExisting && existingBlocks?.length > 0) {
        removedBlocksBackup = existingBlocks.map((block) => ({
          presentation_id: block.presentation_id,
          parent_id: block.parent_id || null,
          block_type_id: block.block_type_id || null,
          title: block.title || 'Tópico sem título',
          summary: block.summary || '',
          content: block.content || '',
          additional_content: block.additional_content || '',
          presenter_notes: block.presenter_notes || '',
          order_index: Number(block.order_index) || 0,
          depth_level: Number(block.depth_level) || 0,
          importance_level: Number(block.importance_level) || 3,
          estimated_duration_seconds: Number(block.estimated_duration_seconds) || 60,
          is_essential: Boolean(block.is_essential),
          is_hidden: Boolean(block.is_hidden),
          is_collapsed: Boolean(block.is_collapsed),
          show_to_audience: block.show_to_audience !== false,
          icon: block.icon || '',
          background_style: block.background_style || '',
          text_style: block.text_style || '',
        }));

        for (const block of existingBlocks) {
          await base44.entities.PresentationBlock.delete(block.id);
        }
      }

      try {
        await base44.entities.PresentationBlock.bulkCreate(blocks);
      } catch (blockCreationError) {
        if (removedBlocksBackup.length > 0) {
          try {
            await base44.entities.PresentationBlock.bulkCreate(removedBlocksBackup);
          } catch (restoreError) {
            console.error('Erro ao restaurar estrutura anterior:', restoreError);
          }
        }
        throw blockCreationError;
      }
      await base44.entities.Presentation.update(id, {
        status: 'draft',
        progress_percentage: 0,
        last_opened_at: new Date().toISOString(),
      });

      window.localStorage.removeItem(storageKey);

      toast({
        title: replaceExisting ? 'Estrutura recriada' : 'Estrutura criada',
        description: `${blocks.length} bloco${blocks.length === 1 ? '' : 's'} foram enviados ao editor.`,
      });
      navigate(`/presentations/${id}/editor`);
    } catch (generateError) {
      console.error('Erro ao gerar estrutura:', generateError);
      toast({
        title: 'Não foi possível gerar a estrutura',
        description: generateError.message || 'Revise as respostas e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    const firstMissingRequired = visibleQuestions.findIndex(
      (question) => question.required && !hasAnswer(answers[question.id]),
    );

    if (firstMissingRequired >= 0) {
      setCurrentStep(firstMissingRequired);
      toast({
        title: 'Complete as perguntas obrigatórias',
        description: 'Falta pelo menos uma resposta necessária para gerar a estrutura.',
        variant: 'destructive',
      });
      return;
    }

    await createGeneratedBlocks();
  };

  const handleNext = async () => {
    if (!validateCurrent()) return;
    if (isLastStep) {
      await handleGenerate();
      return;
    }
    setCurrentStep((step) => Math.min(visibleQuestions.length - 1, step + 1));
  };

  if (userLoading || loading) return <LoadingState />;

  if (error) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4">
        <Card className="w-full border-destructive/30">
          <CardContent className="p-6 text-center">
            <FileText className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-xl font-bold">Não foi possível abrir o guia</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" onClick={() => navigate('/presentations')}>
                Voltar às apresentações
              </Button>
              <Button onClick={loadPage}>Tentar novamente</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion || visibleQuestions.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Nenhuma pergunta aplicável foi configurada para este fluxo.</p>
            <Button className="mt-4" onClick={() => navigate(`/presentations/${id}/editor`)}>
              Abrir editor
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-x-hidden bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/presentations/${id}/editor`)}
              className="-ml-2"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Sair do guia
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => saveAnswers({ showToast: true })}
              disabled={saving || generating}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{currentStep + 1} de {visibleQuestions.length}</span>
            <span>{answeredCount} respondida{answeredCount === 1 ? '' : 's'}</span>
          </div>
          <Progress value={progress} className="mt-2 h-1.5" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {flow?.name || 'Guia essencial'}
            </p>
            <h1 className="truncate text-lg font-bold sm:text-xl">
              {presentation?.title || 'Nova apresentação'}
            </h1>
          </div>
        </div>

        {!flow && (
          <Alert className="mb-5">
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Guia padrão em uso</AlertTitle>
            <AlertDescription>
              Ainda não há um fluxo administrativo específico para esta combinação. Suas respostas continuam sendo salvas e gerarão uma estrutura completa.
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-5 sm:p-8">
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pergunta {currentStep + 1}
                </span>
                {currentQuestion.required && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Obrigatória
                  </span>
                )}
              </div>

              <h2 className="mt-3 text-xl font-bold leading-tight sm:text-2xl">
                {currentQuestion.question_text}
              </h2>

              {currentQuestion.help_text && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {currentQuestion.help_text}
                </p>
              )}
            </div>

            <QuestionField
              question={currentQuestion}
              value={answers[currentQuestion.id]}
              onChange={(value) => updateAnswer(currentQuestion.id, value)}
            />
          </CardContent>
        </Card>
      </main>

      <footer className="sticky bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
            disabled={currentStep === 0 || generating}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Anterior
          </Button>

          <div className="flex w-full gap-2 sm:w-auto">
            {!currentQuestion.required && !isLastStep && (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep((step) => Math.min(visibleQuestions.length - 1, step + 1))}
                disabled={generating}
                className="flex-1 sm:flex-none"
              >
                Pular
              </Button>
            )}

            <Button
              onClick={handleNext}
              disabled={generating || saving}
              className="flex-1 sm:min-w-40 sm:flex-none"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : isLastStep ? (
                <>
                  Gerar estrutura
                  <Check className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </footer>

      <AlertDialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esta apresentação já possui tópicos</AlertDialogTitle>
            <AlertDialogDescription>
              Você pode manter a estrutura existente e abrir o editor, ou apagar somente os blocos atuais e gerar uma nova estrutura com estas respostas. O conteúdo apagado não poderá ser recuperado por esta ação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={generating}>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => navigate(`/presentations/${id}/editor`)}
              disabled={generating}
            >
              Manter e abrir editor
            </Button>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                setReplaceDialogOpen(false);
                createGeneratedBlocks({ replaceExisting: true });
              }}
              disabled={generating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Substituir estrutura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}