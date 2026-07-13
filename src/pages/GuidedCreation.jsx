import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Save,
  Sparkles,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    id: 'fallback-application',
    question_text: 'Qual aplicação prática você deseja propor?',
    help_text: 'O que o público poderá pensar, decidir ou fazer depois?',
    field_type: 'textarea',
    required: false,
    order_index: 5,
    block_type_to_generate: 'application',
    generated_title: 'Aplicação',
  },
  {
    id: 'fallback-conclusion',
    question_text: 'Como você deseja concluir?',
    help_text: 'Resuma a mensagem e defina a forma de encerramento.',
    field_type: 'textarea',
    required: false,
    order_index: 6,
    block_type_to_generate: 'conclusion',
    generated_title: 'Conclusão',
  },
];

function normalizeOptions(rawOptions) {
  if (!rawOptions) return [];

  if (Array.isArray(rawOptions)) {
    return rawOptions.map((option) => {
      if (typeof option === 'string') {
        return { label: option, value: option };
      }

      return {
        label: option.label || option.name || option.value,
        value: String(option.value ?? option.id ?? option.label ?? option.name),
      };
    });
  }

  try {
    const parsed = typeof rawOptions === 'string'
      ? JSON.parse(rawOptions)
      : rawOptions;

    return normalizeOptions(parsed);
  } catch {
    return String(rawOptions)
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({ label: item, value: item }));
  }
}

function hasAnswer(value) {
  if (Array.isArray(value)) return value.length > 0;
  return String(value ?? '').trim().length > 0;
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
  const fieldType = String(question.field_type || 'textarea').toLowerCase();
  const options = normalizeOptions(question.options_json);
  const commonPlaceholder = question.placeholder || 'Digite sua resposta...';

  if (fieldType === 'select') {
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
            <RadioGroupItem
              id={`${question.id}-${option.value}`}
              value={option.value}
            />
            <span className="font-normal">{option.label}</span>
          </Label>
        ))}
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

  const loadPage = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError('');

    try {
      const presentationData = await base44.entities.Presentation.get(id);

      if (!presentationData) {
        throw new Error('Apresentação não encontrada.');
      }

      setPresentation(presentationData);

      const flows = await base44.entities.GuidedFlow.filter(
        {
          presentation_type_id: presentationData.presentation_type_id,
          active: true,
        },
        '-version',
      );

      let selectedFlow = flows?.[0] || null;

      if (selectedFlow && presentationData.objective_id) {
        const exactObjectiveFlow = flows.find(
          (item) => item.objective_id === presentationData.objective_id,
        );
        if (exactObjectiveFlow) selectedFlow = exactObjectiveFlow;
      }

      if (selectedFlow && presentationData.communication_style_id) {
        const exactStyleFlow = flows.find(
          (item) => (
            item.communication_style_id === presentationData.communication_style_id
            && (!item.objective_id || item.objective_id === presentationData.objective_id)
          ),
        );
        if (exactStyleFlow) selectedFlow = exactStyleFlow;
      }

      setFlow(selectedFlow);

      let questionRows = [];
      if (selectedFlow) {
        questionRows = await base44.entities.GuidedQuestion.filter(
          { guided_flow_id: selectedFlow.id, active: true },
          'order_index',
        );
      }

      const effectiveQuestions = questionRows?.length
        ? questionRows
        : FALLBACK_QUESTIONS;

      setQuestions(effectiveQuestions);

      const existingAnswers = await base44.entities.GuidedAnswer.filter({
        presentation_id: id,
      });

      setSavedAnswers(existingAnswers || []);

      const answerMap = {};
      (existingAnswers || []).forEach((item) => {
        answerMap[item.guided_question_id] = item.answer_text ?? item.answer_json ?? '';
      });

      effectiveQuestions.forEach((question) => {
        if (answerMap[question.id] !== undefined) return;

        if (question.destination_field && presentationData[question.destination_field]) {
          answerMap[question.id] = presentationData[question.destination_field];
        }
      });

      setAnswers(answerMap);
    } catch (pageError) {
      console.error('Erro ao carregar criação guiada:', pageError);
      setError(pageError.message || 'Não foi possível abrir a criação guiada.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;
  const progress = questions.length
    ? Math.round(((currentStep + 1) / questions.length) * 100)
    : 0;

  const answeredCount = useMemo(
    () => questions.filter((question) => hasAnswer(answers[question.id])).length,
    [answers, questions],
  );

  const updateAnswer = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const validateCurrent = () => {
    if (!currentQuestion?.required) return true;

    if (!hasAnswer(answers[currentQuestion.id])) {
      toast({
        title: 'Resposta necessária',
        description: 'Responda esta pergunta antes de continuar ou use a opção de pular somente em perguntas opcionais.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const saveAnswers = async ({ showToast = false } = {}) => {
    if (!id) return;

    setSaving(true);

    try {
      const existingByQuestion = Object.fromEntries(
        savedAnswers.map((item) => [item.guided_question_id, item]),
      );

      const storedRows = [...savedAnswers];

      for (const question of questions) {
        const value = answers[question.id];
        if (!hasAnswer(value)) continue;

        const payload = {
          presentation_id: id,
          guided_question_id: question.id,
          answer_text: Array.isArray(value) ? value.join('\n') : String(value),
          answer_json: Array.isArray(value) ? value : null,
        };

        const existing = existingByQuestion[question.id];
        if (existing?.id) {
          const updated = await base44.entities.GuidedAnswer.update(existing.id, payload);
          const index = storedRows.findIndex((item) => item.id === existing.id);
          if (index >= 0) storedRows[index] = updated || { ...existing, ...payload };
        } else {
          const created = await base44.entities.GuidedAnswer.create(payload);
          if (created) storedRows.push(created);
        }
      }

      const presentationUpdates = {};
      questions.forEach((question) => {
        const value = answers[question.id];
        if (question.destination_field && hasAnswer(value)) {
          presentationUpdates[question.destination_field] = value;
        }
      });

      if (Object.keys(presentationUpdates).length > 0) {
        await base44.entities.Presentation.update(id, presentationUpdates);
        setPresentation((current) => ({ ...current, ...presentationUpdates }));
      }

      setSavedAnswers(storedRows);

      if (showToast) {
        toast({ title: 'Rascunho salvo' });
      }
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
    const typeByCode = Object.fromEntries(
      blockTypes.map((item) => [String(item.code || '').toLowerCase(), item]),
    );

    const defaultType = typeByCode.topic || typeByCode.section || blockTypes[0];
    const blocks = [];
    let orderIndex = 0;

    questions.forEach((question) => {
      const rawValue = answers[question.id];
      if (!hasAnswer(rawValue) || !question.block_type_to_generate) return;

      const code = String(question.block_type_to_generate).toLowerCase();
      const blockType = typeByCode[code] || defaultType;
      if (!blockType) return;

      const stringValue = Array.isArray(rawValue)
        ? rawValue.join('\n')
        : String(rawValue).trim();

      const shouldSplitLines = question.split_lines
        || code === 'topic'
        || code === 'subtopic';

      const lines = shouldSplitLines
        ? stringValue.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
        : [stringValue];

      lines.forEach((line, lineIndex) => {
        const generatedTitle = question.generated_title
          || (lines.length > 1 ? line : question.question_short_title)
          || (code === 'conclusion' ? 'Conclusão' : null)
          || (code === 'application' ? 'Aplicação' : null)
          || (code === 'section' ? question.question_text : null)
          || line;

        const titleUsesLine = shouldSplitLines || lines.length > 1;

        blocks.push({
          presentation_id: id,
          parent_id: null,
          block_type_id: blockType.id,
          title: titleUsesLine ? line : generatedTitle,
          summary: '',
          content: titleUsesLine && lineIndex >= 0 ? '' : line,
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

        if (!titleUsesLine) {
          blocks[blocks.length - 1].content = line;
        }

        orderIndex += 1;
      });
    });

    if (blocks.length === 0) {
      blocks.push({
        presentation_id: id,
        parent_id: null,
        block_type_id: defaultType?.id,
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

  const handleGenerate = async () => {
    const firstMissingRequired = questions.findIndex(
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

    setGenerating(true);

    try {
      await saveAnswers();

      const existingBlocks = await base44.entities.PresentationBlock.filter({
        presentation_id: id,
      });

      if (existingBlocks?.length > 0) {
        toast({
          title: 'Estrutura já existente',
          description: 'As respostas foram salvas. Abrimos o editor sem duplicar seus tópicos.',
        });
        navigate(`/presentations/${id}/editor`);
        return;
      }

      const blockTypes = await base44.entities.BlockType.filter({ active: true }, 'order_index');
      const blocks = buildBlocks(blockTypes || []);

      if (blocks.length > 0) {
        await base44.entities.PresentationBlock.bulkCreate(blocks);
      }

      await base44.entities.Presentation.update(id, {
        status: 'draft',
        progress_percentage: 0,
        last_opened_at: new Date().toISOString(),
      });

      toast({
        title: 'Estrutura criada',
        description: `${blocks.length} bloco${blocks.length === 1 ? '' : 's'} foram enviados ao editor.`,
      });

      navigate(`/presentations/${id}/editor`);
    } catch (generateError) {
      console.error('Erro ao gerar estrutura:', generateError);
      toast({
        title: 'Não foi possível gerar a estrutura',
        description: 'Revise as respostas e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleNext = async () => {
    if (!validateCurrent()) return;

    if (isLastStep) {
      await handleGenerate();
      return;
    }

    setCurrentStep((step) => Math.min(questions.length - 1, step + 1));
  };

  if (loading) return <LoadingState />;

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

  if (!currentQuestion || questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Nenhuma pergunta foi configurada para este fluxo.</p>
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
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{currentStep + 1} de {questions.length}</span>
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
              {flow?.name || 'Criação guiada'}
            </p>
            <h1 className="truncate text-lg font-bold sm:text-xl">
              {presentation?.title || 'Nova apresentação'}
            </h1>
          </div>
        </div>

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
                onClick={() => setCurrentStep((step) => Math.min(questions.length - 1, step + 1))}
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
    </div>
  );
}