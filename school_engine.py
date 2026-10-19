import random
import copy

def run_school_genetic_algorithm(class_data, config):

    #Configuration
    days            = int(config.get("days", 5))
    periods_per_day = int(config.get("periods_per_day", 7))
    POPULATION_SIZE = int(config.get("population_size", 50))
    GENERATIONS     = int(config.get("generations", 80))
    MUTATION_RATE   = float(config.get("mutation_rate", 0.35))

    HARD_WEIGHT = 200   # teacher clash penalty per occurrence
    SOFT_WEIGHT = 5     # soft constraint penalty weight

    #Helper: build session list for a class
    def build_sessions(subjects):
        """Return a list of "subject::teacher" strings, repeated weekly_periods times."""
        sessions = []
        for s in subjects:
            sub  = s.get("subject", "Unknown").strip()
            tea  = s.get("teacher", "Unknown").strip()
            freq = max(1, int(s.get("weekly_periods", 1)))
            tag  = f"{sub}::{tea}"
            sessions.extend([tag] * freq)
        return sessions

    #Random individual generator 
    def generate_random_timetable():
        timetable = {}
        # Track slot -> set(teachers) placed globally per slot
        slot_teachers = {}   # (day, period) -> set of teachers

        for cls_name, subjects in class_data.items():
            sessions = build_sessions(subjects)
            random.shuffle(sessions)

            # Build empty timetable
            grid = [[None] * periods_per_day for _ in range(days)]

            # Build all (day, period) positions; shuffle for randomness
            all_positions = [(d, p) for d in range(days) for p in range(periods_per_day)]
            random.shuffle(all_positions)

            placed = 0
            for session in sessions:
                teacher = session.split("::")[1] if "::" in session else ""
                placed_flag = False
                for (d, p) in all_positions:
                    if grid[d][p] is None:
                        # Prefer slots where teacher is not already used
                        if teacher not in slot_teachers.get((d, p), set()):
                            grid[d][p] = session
                            slot_teachers.setdefault((d, p), set()).add(teacher)
                            placed_flag = True
                            break
                if not placed_flag:
                    for (d, p) in all_positions:
                        if grid[d][p] is None:
                            grid[d][p] = session
                            slot_teachers.setdefault((d, p), set()).add(teacher)
                            placed_flag = True
                            break
                if placed_flag:
                    placed += 1

            timetable[cls_name] = grid

        return timetable

    #Fitness function
    def calculate_fitness(individual):
        hard = 0
        soft = 0
        slot_to_teachers = {}   # (day, period) -> [teacher, ...]
        for cls_name, grid in individual.items():
            for d in range(days):
                for p in range(periods_per_day):
                    cell = grid[d][p]
                    if cell:
                        teacher = cell.split("::")[1] if "::" in cell else ""
                        if teacher:
                            slot_to_teachers.setdefault((d, p), []).append(teacher)

        # Hard: teacher clash (same teacher in same slot across different classes)
        for (d, p), teachers in slot_to_teachers.items():
            # Count duplicates
            seen = {}
            for t in teachers:
                seen[t] = seen.get(t, 0) + 1
            for t, cnt in seen.items():
                if cnt > 1:
                    hard += (cnt - 1)

        # Soft constraints per class
        for cls_name, grid in individual.items():
            for d in range(days):
                subjects_today = {}
                for p in range(periods_per_day):
                    cell = grid[d][p]
                    if cell:
                        sub = cell.split("::")[0]
                        subjects_today[sub] = subjects_today.get(sub, 0) + 1
                        # Consecutive same subject penalty
                        if p > 0 and grid[d][p - 1] is not None:
                            prev_sub = grid[d][p - 1].split("::")[0]
                            if prev_sub == sub:
                                soft += 2
                    # Soft: free slot penalty (unscheduled periods)
                    else:
                        soft += 1

                # Same subject > 2 times in a day
                for cnt in subjects_today.values():
                    if cnt > 2:
                        soft += (cnt - 2) * 2

        return -(HARD_WEIGHT * hard + SOFT_WEIGHT * soft)

    #Crossover
    def crossover(parent1, parent2):
        child = {}
        for cls_name in parent1:
            if random.random() < 0.5:
                child[cls_name] = copy.deepcopy(parent1[cls_name])
            else:
                child[cls_name] = copy.deepcopy(parent2[cls_name])
        return child

    #Mutate
    def mutate(individual, rate):
        for cls_name in individual:
            if random.random() < rate:
                grid = individual[cls_name]
                # Collect occupied positions
                occupied = [(d, p)
                            for d in range(days)
                            for p in range(periods_per_day)
                            if grid[d][p] is not None]
                if len(occupied) >= 2:
                    (d1, p1), (d2, p2) = random.sample(occupied, 2)
                    grid[d1][p1], grid[d2][p2] = grid[d2][p2], grid[d1][p1]
        return individual

    #Initial Population
    population = []
    for i in range(POPULATION_SIZE):
        try:
            timetable = generate_random_timetable()
            population.append(timetable)
        except Exception as e:
            if i == 0:
                raise e
            population.append(copy.deepcopy(population[0]))

    #GA Loop
    generation_history = []
    for generation in range(GENERATIONS):
        population = sorted(population, key=calculate_fitness, reverse=True)
        best_fitness = calculate_fitness(population[0])
        generation_history.append({
            "generation": generation + 1,
            "fitness": best_fitness
        })

        # Elitism – keep top 10%
        elite_count = max(1, int(POPULATION_SIZE * 0.1))
        next_gen = population[:elite_count]

        while len(next_gen) < POPULATION_SIZE:
            p1 = max(random.sample(population, min(len(population), 5)), key=calculate_fitness)
            p2 = max(random.sample(population, min(len(population), 5)), key=calculate_fitness)
            child = crossover(p1, p2)
            child = mutate(child, MUTATION_RATE)
            next_gen.append(child)

        population = next_gen

    #Final Result
    population = sorted(population, key=calculate_fitness, reverse=True)
    best = population[0]
    final_fitness = calculate_fitness(best)

    return {
        "timetable": best,
        "fitness": final_fitness,
        "history": generation_history,
        "config": {
            "days": days,
            "periods_per_day": periods_per_day
        }
    }
