import json
import os
import time
import re
from deep_translator import GoogleTranslator

# CONFIGURAÇÕES DE CAMINHO
CAMINHO_ORIGEM = r'.\academia\src\data\exercises.json'
CAMINHO_DESTINO = r'\academia\src\data\exercises_pt.json'

MAPA_TECNICO = {
    "abdominals": "abdominais", "hamstrings": "isquiotibiais",
    "adductors": "adutores", "abductors": "abdutores",
    "quadriceps": "quadríceps", "biceps": "bíceps",
    "triceps": "tríceps", "shoulders": "ombros",
    "chest": "peito", "middle back": "costas (meio)",
    "lower back": "lombar", "lats": "latíssimo do dorso",
    "traps": "trapézio", "calves": "panturrilha",
    "forearms": "antebraço", "glutes": "glúteos", "neck": "pescoço",
    "beginner": "iniciante", "intermediate": "intermediário", "expert": "avançado",
    "body only": "peso corporal", "machine": "máquina", "foam roll": "rolo de espuma",
    "kettlebells": "kettlebell", "dumbbell": "halteres", "barbell": "barra",
    "cable": "cabo", "bands": "elásticos", "exercise ball": "bola de exercício",
    "e-z curl bar": "barra W"
}

def estilizar_nome(nome):

# Dicionário de substituição para nomes clássicos
    subs = {
        "Bench Press": "Supino",
        "Curl": "Rosca",
        "Push-Up": "Flexão de Braço",
        "Pull-Up": "Barra Fixa",
        "Squat": "Agachamento",
        "Lunge": "Avanço/Afundo",
        "Raise": "Elevação",
        "Triceps Extension": "Extensão de Tríceps",
        "Row": "Remada",
        "Crunch": "Abdominal",
        "Sit-Up": "Abdominal"
    }
    
    novo_nome = nome
    termos_nutella = ["Deadlift", "Snatch", "Clean", "Jerk", "Burpee", "Swing", "Prowler", "Sled", "Plank"]

    if any(t.lower() in nome.lower() for t in termos_nutella):
        return nome 
    
    for eng, pt in subs.items():
        novo_nome = re.sub(eng, pt, novo_nome, flags=re.IGNORECASE)
        
    # Ajusta conectivos (Halteres, Barra, etc)
    novo_nome = novo_nome.replace("Dumbbell", "com Halteres")
    novo_nome = novo_nome.replace("Barbell", "com Barra")
    novo_nome = novo_nome.replace("Cable", "no Cabo")
    
    return novo_nome.strip()

def refinar_instrucoes(texto_pt):

    melhorias = {
        "Dica:": "💡 **Dica:**",
        "Ponta:": "💡 **Dica:**",
        "Sugestão:": "💡 **Dica:**",
        "Expire ao fazer": "Solte o ar durante",
        "Inale ao fazer": "Respire fundo durante",
        "Inicie a posição": "Fique na posição inicial",
        "Repita para a quantidade": "Repita conforme a quantidade"
    }
    for antigo, novo in melhorias.items():
        texto_pt = texto_pt.replace(antigo, novo)
    
    return texto_pt.strip().capitalize()

def processar_academia():
    if not os.path.exists(CAMINHO_ORIGEM):
        print("Arquivo original não encontrado!")
        return

    with open(CAMINHO_ORIGEM, 'r', encoding='utf-8') as f:
        exercicios = json.load(f)

    translator = GoogleTranslator(source='en', target='pt')
    total = len(exercicios)
    
    print(f"--- Iniciando Tradução Profissional ({total} itens) ---")

    for i, ex in enumerate(exercicios):
        ex['name_en'] = ex['name']
        # Nome Híbrido
        ex['name'] = estilizar_nome(ex['name'])
        ex['level'] = MAPA_TECNICO.get(ex['level'], ex['level'])
        ex['equipment'] = MAPA_TECNICO.get(ex['equipment'], ex['equipment'])
        ex['primaryMuscles'] = [MAPA_TECNICO.get(m, m) for m in ex['primaryMuscles']]
        ex['secondaryMuscles'] = [MAPA_TECNICO.get(m, m) for m in ex['secondaryMuscles']]

        # Instruções Refinadas
        if 'instructions' in ex:
            inst_traduzidas = []
            for linha in ex['instructions']:
                try:
                    traducao = translator.translate(linha)
                    inst_traduzidas.append(refinar_instrucoes(traducao))
                except:
                    inst_traduzidas.append(linha)
            ex['instructions'] = inst_traduzidas

        print(f"[{i+1}/{total}] Sucesso: {ex['name']}")
        
        if (i+1) % 15 == 0: time.sleep(1)

    # Salvando o novo arquivo
    with open(CAMINHO_DESTINO, 'w', encoding='utf-8') as f:
        json.dump(exercicios, f, ensure_ascii=False, indent=2)

    print(f"\n--- TRADUÇÃO CONCLUÍDA! Arquivo em: {CAMINHO_DESTINO} ---")

if __name__ == "__main__":
    processar_academia()