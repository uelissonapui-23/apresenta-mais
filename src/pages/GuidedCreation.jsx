import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function GuidedCreation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [presentation, setPresentation] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const load = async () => {
      const p = await base44.entities.Presentation.get(id);
      setPresentation(p);

      const flows = await base44.entities.GuidedFlow.filter({ presentation_type_id: p.presentation_type_id, active: true }, 'version', 1);
      if (flows.length > 0) {
        const q = await base44.entities.GuidedQuestion.filter({ guided_flow_id: flows[0].id, active: true }, 'order_index');
        setQuestions(q);
      } else {
        // Default questions
        setQuestions([
          { id: 'q1', question_text: 'Qual é o tema principal?', help_text: 'Descreva o assunto central da sua apresentação.', field_type: 'textarea', block_type_to_generate: 'topic' },
          { id: 'q2', question_text: 'Qual é a mensagem principal?', help_text: 'O que você quer que as pessoas lembrem?', field_type: 'textarea', block_type_to_generate: 'topic' },
          { id: 'q3', question_text: 'Quais são os pontos principais?', help_text: 'Liste os tópicos que deseja abordar. Use uma linha por tópico.', field_type: 'textarea', block_type_to_generate: 'section' },
          { id: 'q4', question_text: 'Como será a introdução?', help_text: 'Descreva como pretende começar.', field_type: 'textarea', block_type_to_generate: 'section' },
          { id: 'q5', question_text: 'Como será a conclusão?', help_text: 'Descreva como pretende encerrar.', field_type: 'textarea', block_type_to_generate: 'conclusion' },
        ]);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleGenerate = async () => {
    setGenerating(true);
    const blockTypes = await base44.entities.BlockType.filter({ active: true });
    const sectionType = blockTypes.find(bt => bt.code === 'section');
    const topicType = blockTypes.find(bt => bt.code === 'topic');
    const conclusionType = blockTypes.find(bt => bt.code === 'conclusion');

    const blocksToCreate = [];
    let order = 0;

    // Introduction
    if (answers['q4']) {
      blocksToCreate.push({
        presentation_id: id, title: 'Introdução', content: answers['q4'],
        block_type_id: sectionType?.id, order_index: order++, depth_level: 0, is_essential: true,
      });
    }

    // Main points
    if (answers['q3']) {
      const points = answers['q3'].split('\n').filter(p => p.trim());
      for (const point of points) {
        blocksToCreate.push({
          presentation_id: id, title: point.trim(), block_type_id: topicType?.id || sectionType?.id,
          order_index: order++, depth_level: 0, is_essential: true,
        });
      }
    }

    // Conclusion
    if (answers['q5']) {
      blocksToCreate.push({
        presentation_id: id, title: 'Conclusão', content: answers['q5'],
        block_type_id: conclusionType?.id || sectionType?.id, order_index: order++, depth_level: 0, is_essential: true,
      });
    }

    if (blocksToCreate.length > 0) {
      await base44.entities.PresentationBlock.bulkCreate(blocksToCreate);
    }

    // Save answers
    for (const [qId, answer] of Object.entries(answers)) {
      if (answer) {
        await base44.entities.GuidedAnswer.create({
          presentation_id: id, guided_question_id: qId, answer_text: answer,
        });
      }
    }

    // Update presentation
    await base44.entities.Presentation.update(id, { main_message: answers['q2'] || '', main_theme: answers['q1'] || '' });

    setGenerating(false);
    toast({ title: 'Estrutura gerada com sucesso!' });
    navigate(`/presentations/${id}/editor`);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const currentQ = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;
  const isLast = currentStep === questions.length - 1;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-30 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4 mr-1" />Voltar</Button>
          <span className="text-sm text-muted-foreground">{currentStep + 1} de {questions.length}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-lg mx-auto w-full">
        {currentQ && (
          <div className="space-y-4 py-8">
            <h2 className="text-xl font-bold">{currentQ.question_text}</h2>
            {currentQ.help_text && <p className="text-sm text-muted-foreground">{currentQ.help_text}</p>}
            {currentQ.field_type === 'text' ? (
              <Input value={answers[currentQ.id] || ''} onChange={e => setAnswers(a => ({ ...a, [currentQ.id]: e.target.value }))} placeholder="Sua resposta..." />
            ) : (
              <Textarea rows={5} value={answers[currentQ.id] || ''} onChange={e => setAnswers(a => ({ ...a, [currentQ.id]: e.target.value }))} placeholder="Sua resposta..." className="resize-none" />
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4 safe-area-bottom">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" />Anterior
          </Button>
          {!isLast ? (
            <Button className="flex-1" onClick={() => setCurrentStep(s => s + 1)}>
              Próximo<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Gerando...' : 'Gerar estrutura'}<Check className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
        <div className="text-center mt-2">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentStep(s => Math.min(questions.length - 1, s + 1))}>
            Pular esta pergunta
          </Button>
        </div>
      </div>
    </div>
  );
}