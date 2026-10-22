import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  OBJECTION_CATEGORIES,
  generateObjectionResponses,
  classifyObjectionQuery
} from '../scripts/handle-objection.mjs';

describe('T34: objection-handler - Matriz de Persuasión WhatsApp', () => {
  test('T34.1: OBJECTION_CATEGORIES contiene las 5 categorías clave de prospección', () => {
    assert.deepEqual(OBJECTION_CATEGORIES, [
      'precio',
      'instagram',
      'tiempo',
      'dudas_pacientes',
      'decision'
    ]);
  });

  test('T34.2: classifyObjectionQuery infiere la categoría adecuada a partir de texto libre', () => {
    assert.equal(classifyObjectionQuery('Me parece muy caro el presupuesto'), 'precio');
    assert.equal(classifyObjectionQuery('Ya tengo perfil de Instagram y me va bien'), 'instagram');
    assert.equal(classifyObjectionQuery('No tengo tiempo para coordinar una página web'), 'tiempo');
    assert.equal(classifyObjectionQuery('Mis pacientes son grandes y no van a usar una web'), 'dudas_pacientes');
    assert.equal(classifyObjectionQuery('Lo tengo que pensar con mi socio'), 'decision');
  });

  test('T34.3: generateObjectionResponses genera 3 ángulos persuasivos con datos inyectados', () => {
    const result = generateObjectionResponses({
      category: 'precio',
      nombre: 'Martín',
      rubro: 'abogado',
      slug: '20-martin-albarracin-abogado'
    });

    assert.equal(result.category, 'precio');
    assert.ok(result.angles.reliefOpportunity, 'Debe incluir ángulo de alivio y costo de oportunidad');
    assert.ok(result.angles.riskReversal7d, 'Debe incluir ángulo de reversión de riesgo a 7 días');
    assert.ok(result.angles.audiovisualAfterbow, 'Debe incluir ángulo de apalancamiento AfterBow');

    // Comprobaciones de contenido en voseo argentino y datos NexoBow
    assert.match(result.angles.reliefOpportunity, /Martín/);
    assert.match(result.angles.reliefOpportunity, /\$189\.999|\$12\.259/);
    assert.match(result.angles.riskReversal7d, /7 días/);
    assert.match(result.angles.audiovisualAfterbow, /AfterBow/);
    assert.match(result.angles.riskReversal7d, /preview\.nexobow\.site\/20-martin-albarracin-abogado\//);
  });

  test('T34.4: generateObjectionResponses respeta el voseo argentino profesional en todas las categorías', () => {
    for (const cat of OBJECTION_CATEGORIES) {
      const res = generateObjectionResponses({
        category: cat,
        nombre: 'Dra. Gómez',
        rubro: 'clinica',
        slug: '15-gomez-clinica'
      });

      for (const angleKey of ['reliefOpportunity', 'riskReversal7d', 'audiovisualAfterbow']) {
        const text = res.angles[angleKey];
        assert.ok(text.length > 50, `El texto para ${cat} - ${angleKey} debe ser sustantivo`);
        // Verificamos presencia de voseo (mirá, fijate, pensá, tenés, podés, estás, etc.)
        const hasVoseo = /tenés|podés|estás|fijate|mirá|pensalo|querés|dejás|hacés/i.test(text);
        assert.ok(hasVoseo, `El texto debe usar voseo argentino: "${text}"`);
      }
    }
  });
});
