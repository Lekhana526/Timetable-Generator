import random
import copy

def run_genetic_algorithm(batch_data, config):

    # Load configuration
    days = int(config.get("days", 5))
    theory_slots = int(config.get("theory_slots", 4))
    lab_slots = int(config.get("lab_slots", 3))
    slots_per_day = theory_slots + lab_slots

    theory_rooms = [r for r in config.get("theory_rooms", ["R101", "R102"]) if r]
    lab_rooms = [r for r in config.get("lab_rooms", ["LAB1", "LAB2"]) if r]

    if not theory_rooms:
        theory_rooms = ["R101", "R102"]
    if not lab_rooms:
        lab_rooms = ["LAB1", "LAB2"]

    POPULATION_SIZE = int(config.get("population_size", 50))
    GENERATIONS = int(config.get("generations", 50))
    MUTATION_RATE = float(config.get("mutation_rate", 0.5))

    # Ensure theory_rooms and lab_rooms have enough distinct room names for parallel groups
    max_theory_parallel = 1
    max_lab_parallel = 1
    for batch, details in batch_data.items():
        t_counts = {}
        for item in details.get("theory", []):
            k = (item.get("code") or item.get("name") or "").strip().upper()
            if k:
                t_counts[k] = t_counts.get(k, 0) + 1
        for c in t_counts.values():
            if c > max_theory_parallel:
                max_theory_parallel = c

        l_counts = {}
        for item in details.get("labs", []):
            k = (item.get("code") or item.get("name") or "").strip().upper()
            if k:
                l_counts[k] = l_counts.get(k, 0) + 1
        for c in l_counts.values():
            if c > max_lab_parallel:
                max_lab_parallel = c

    # Expand theory_rooms if user provided fewer room names than parallel groups
    r_count = 101
    while len(theory_rooms) < max_theory_parallel * max(1, len(batch_data)):
        new_room = f"R{r_count}"
        if new_room not in theory_rooms:
            theory_rooms.append(new_room)
        r_count += 1

    # Expand lab_rooms if user provided fewer lab room names than parallel lab groups
    l_count = 1
    while len(lab_rooms) < max_lab_parallel * max(1, len(batch_data)):
        new_room = f"LAB{l_count}"
        if new_room not in lab_rooms:
            lab_rooms.append(new_room)
        l_count += 1

    # Helper function matching original implementation
    def generate_random_timetable(batch_data, days, slots_per_day):
        timetable = {}
        teacher_schedule = {}
        room_schedule = {}

        # Theory slots
        theory_available = []
        for day in range(days):
            for period in range(theory_slots):
                theory_available.append(day * slots_per_day + period)

        for batch, details in batch_data.items():
            table = [[None for _ in range(slots_per_day)] for _ in range(days)]
            available_theory_slots = theory_available.copy()

            # Group theory subjects by Name or Code (normalized)
            theory_groups = {}
            for t_item in details.get("theory", []):
                name_key = str(t_item.get("name") or "").strip().lower()
                code_key = str(t_item.get("code") or "").strip().lower()
                k = name_key if name_key else code_key
                if not k:
                    continue
                if k not in theory_groups:
                    theory_groups[k] = []
                theory_groups[k].append(t_item)

            # THEORY ASSIGNMENT
            for code, sub_entries in theory_groups.items():
                credits = int(sub_entries[0].get("credits", 3))
                
                # Pass 1: Strict check - all teachers free and enough free rooms
                valid_slots = []
                for slot in available_theory_slots:
                    teachers_free = all(slot not in teacher_schedule.get(e.get("teacher"), set()) for e in sub_entries)
                    free_rooms_count = sum(1 for room in theory_rooms if slot not in room_schedule.get(room, set()))
                    if teachers_free and free_rooms_count >= len(sub_entries):
                        valid_slots.append(slot)

                # Pass 2: Fallback - available slots where teachers are free
                if len(valid_slots) < credits:
                    for slot in available_theory_slots:
                        if slot not in valid_slots:
                            teachers_free = all(slot not in teacher_schedule.get(e.get("teacher"), set()) for e in sub_entries)
                            if teachers_free:
                                valid_slots.append(slot)

                # Pass 3: Fallback - any available theory slots for this batch
                if len(valid_slots) < credits:
                    for slot in available_theory_slots:
                        if slot not in valid_slots:
                            valid_slots.append(slot)

                # Select slots
                num_to_pick = min(credits, len(valid_slots))
                chosen_slots = random.sample(valid_slots, num_to_pick) if num_to_pick > 0 else []

                for slot in chosen_slots:
                    day_idx = slot // slots_per_day
                    period_idx = slot % slots_per_day

                    # Pick distinct rooms for each sub_entry
                    available_rooms = [r for r in theory_rooms if slot not in room_schedule.get(r, set())]
                    
                    # If not enough free rooms, generate dynamic fallback rooms
                    fallback_idx = 1
                    while len(available_rooms) < len(sub_entries):
                        f_room = f"R{100 + fallback_idx}"
                        if f_room not in available_rooms:
                            available_rooms.append(f_room)
                        fallback_idx += 1

                    session_strings = []
                    for entry in sub_entries:
                        code = entry.get("code", "")
                        teacher = entry.get("teacher")
                        group = entry.get("group", "")
                        name = entry.get("name", "")

                        assigned_room = available_rooms.pop(0)

                        session_strings.append(f"{code}::{name}::{teacher}::{assigned_room}::{group}")
                        teacher_schedule.setdefault(teacher, set()).add(slot)
                        room_schedule.setdefault(assigned_room, set()).add(slot)

                    table[day_idx][period_idx] = " | ".join(session_strings)
                    if slot in available_theory_slots:
                        available_theory_slots.remove(slot)

            # Group lab subjects by Name or Code (normalized)
            lab_groups = {}
            for l_item in details.get("labs", []):
                name_key = str(l_item.get("name") or "").strip().lower()
                code_key = str(l_item.get("code") or "").strip().lower()
                k = name_key if name_key else code_key
                if not k:
                    continue
                if k not in lab_groups:
                    lab_groups[k] = []
                lab_groups[k].append(l_item)

            # LAB ASSIGNMENT
            for code, sub_entries in lab_groups.items():
                possible_days = []
                for day_idx in range(days):
                    afternoon_slots = [
                        day_idx * slots_per_day + theory_slots + i
                        for i in range(lab_slots)
                    ]

                    # Ensure the batch has the entire afternoon free
                    batch_free = all(
                        table[day_idx][p] is None
                        for p in range(theory_slots, slots_per_day)
                    )
                    if not batch_free:
                        continue

                    # Check if teachers are free
                    teachers_free = all(
                        all(slot not in teacher_schedule.get(e.get("teacher"), set()) for slot in afternoon_slots)
                        for e in sub_entries
                    )
                    if teachers_free:
                        possible_days.append(day_idx)

                # Fallback: pick any day where batch afternoon is free
                if not possible_days:
                    for day_idx in range(days):
                        batch_free = all(
                            table[day_idx][p] is None
                            for p in range(theory_slots, slots_per_day)
                        )
                        if batch_free:
                            possible_days.append(day_idx)

                if not possible_days:
                    continue

                chosen_day = random.choice(possible_days)

                # Pick distinct lab rooms
                available_lab_rooms = []
                for room in lab_rooms:
                    room_is_free = True
                    for period in range(theory_slots, slots_per_day):
                        slot = chosen_day * slots_per_day + period
                        if slot in room_schedule.get(room, set()):
                            room_is_free = False
                            break
                    if room_is_free:
                        available_lab_rooms.append(room)

                # Generate fallback lab rooms if needed
                fallback_l_idx = 1
                while len(available_lab_rooms) < len(sub_entries):
                    f_lab = f"LAB{fallback_l_idx}"
                    if f_lab not in available_lab_rooms:
                        available_lab_rooms.append(f_lab)
                    fallback_l_idx += 1

                # Assign to table slots
                for period in range(theory_slots, slots_per_day):
                    slot = chosen_day * slots_per_day + period
                    
                    session_strings = []
                    rooms_for_this_lab = available_lab_rooms[:len(sub_entries)]

                    for idx, entry in enumerate(sub_entries):
                        code = entry.get("code", "")
                        teacher = entry.get("teacher")
                        group = entry.get("group", "")
                        name = entry.get("name", "")
                        assigned_room = rooms_for_this_lab[idx]

                        session_strings.append(f"{code}::{name}::{teacher}::{assigned_room}::{group}")
                        teacher_schedule.setdefault(teacher, set()).add(slot)
                        room_schedule.setdefault(assigned_room, set()).add(slot)

                    table[chosen_day][period] = " | ".join(session_strings)

            timetable[batch] = table

        return timetable, teacher_schedule, room_schedule

    # Fitness logic matching original implementation
    def calculate_fitness(individual):
        HARD_WEIGHT = 100
        SOFT_WEIGHT = 5

        hard_constraints = 0
        soft_constraints = 0

        # HARD CONSTRAINTS
        for day_idx in range(days):
            for slot in range(slots_per_day):
                teachers = []
                rooms = []
                for batch in individual:
                    cell = individual[batch][day_idx][slot]
                    if cell is not None:
                        sessions = cell.split(" | ")
                        for session in sessions:
                            parts = session.split("::") if "::" in session else session.split("-")
                            # Format: code-name-teacher-room-group
                            if len(parts) >= 4:
                                teacher = parts[2]
                                room = parts[3]
                                teachers.append(teacher)
                                rooms.append(room)
                # Teacher clash
                hard_constraints += len(teachers) - len(set(teachers))
                # Room clash
                hard_constraints += len(rooms) - len(set(rooms))

        # SOFT CONSTRAINTS
        for batch in individual:
            table = individual[batch]
            for day_idx in range(days):
                subjects_today = {}
                # Theory slots only
                for slot in range(theory_slots):
                    cell = table[day_idx][slot]
                    if cell is None:
                        # Free theory period
                        soft_constraints += 1
                        continue
                    
                    sessions = cell.split(" | ")
                    subject = (sessions[0].split("::")[0] if "::" in sessions[0] else sessions[0].split("-")[0]) # Compare by Course Code
                    
                    subjects_today[subject] = subjects_today.get(subject, 0) + 1
                    # Consecutive same subject
                    if slot < theory_slots - 1:
                        next_cell = table[day_idx][slot + 1]
                        if next_cell is not None:
                            first_sess = next_cell.split(" | ")[0]
                            next_subject = first_sess.split("::")[0] if "::" in first_sess else first_sess.split("-")[0]
                            if subject == next_subject:
                                soft_constraints += 2

                # More than 2 classes of same subject in one day
                for count in subjects_today.values():
                    if count > 2:
                        soft_constraints += (count - 2)

        fitness = -(HARD_WEIGHT * hard_constraints + SOFT_WEIGHT * soft_constraints)
        return fitness

    def crossover(parent1, parent2):
        child = {}
        for batch in parent1:
            if random.random() < 0.5:
                child[batch] = copy.deepcopy(parent1[batch])
            else:
                child[batch] = copy.deepcopy(parent2[batch])
        return child

    def mutate(individual, mutation_rate):
        for batch in individual:
            # THEORY MUTATION
            if random.random() < mutation_rate:
                occupied = []
                for day_idx in range(days):
                    for slot in range(theory_slots):
                        if individual[batch][day_idx][slot] is not None:
                            occupied.append((day_idx, slot))

                if len(occupied) >= 2:
                    (d1, s1), (d2, s2) = random.sample(occupied, 2)
                    individual[batch][d1][s1], individual[batch][d2][s2] = \
                        individual[batch][d2][s2], individual[batch][d1][s1]

            # LAB MUTATION
            if random.random() < mutation_rate:
                lab_days = []
                for day_idx in range(days):
                    if any(
                        individual[batch][day_idx][slot] is not None
                        for slot in range(theory_slots, slots_per_day)
                    ):
                        lab_days.append(day_idx)
                if len(lab_days) >= 2:
                    d1, d2 = random.sample(lab_days, 2)
                    for slot in range(theory_slots, slots_per_day):
                        individual[batch][d1][slot], individual[batch][d2][slot] = \
                            individual[batch][d2][slot], individual[batch][d1][slot]
        return individual

    # Generate Initial Population
    population = []
    # If the generator functions raise an exception during generation, let's catch it
    for i in range(POPULATION_SIZE):
        try:
            timetable, _, _ = generate_random_timetable(batch_data, days, slots_per_day)
            population.append(timetable)
        except ValueError as e:
            # If even initial random generation fails, bubble the error up
            if i == 0:
                raise e
            # Otherwise use copies of existing ones to prevent crashing if configs are tight
            population.append(copy.deepcopy(population[0]))

    # Genetic Algorithm Loop
    generation_history = []
    for generation in range(GENERATIONS):
        # Sort according to fitness (higher is better)
        population = sorted(
            population,
            key=lambda ind: calculate_fitness(ind),
            reverse=True
        )

        best_fitness = calculate_fitness(population[0])
        generation_history.append({
            "generation": generation + 1,
            "fitness": best_fitness
        })

        # Elitism (Top 10%)
        elite_count = max(1, int(POPULATION_SIZE * 0.1))
        next_generation = population[:elite_count]

        # Create remaining population
        while len(next_generation) < POPULATION_SIZE:
            parent1 = max(
                random.sample(population, min(len(population), 5)),
                key=calculate_fitness
            )
            parent2 = max(
                random.sample(population, min(len(population), 5)),
                key=calculate_fitness
            )
            child = crossover(parent1, parent2)
            child = mutate(child, MUTATION_RATE)
            next_generation.append(child)

        population = next_generation

    # Final selection
    population = sorted(
        population,
        key=lambda ind: calculate_fitness(ind),
        reverse=True
    )

    best_individual = population[0]
    final_fitness = calculate_fitness(best_individual)

    return {
        "timetable": best_individual,
        "fitness": final_fitness,
        "history": generation_history,
        "config": {
            "days": days,
            "theory_slots": theory_slots,
            "lab_slots": lab_slots,
            "slots_per_day": slots_per_day,
            "theory_rooms": theory_rooms,
            "lab_rooms": lab_rooms
        }
    }
