# import bpy
# import mathutils
# import sys

# # Перенаправляем вывод в файл debug_log.txt (он появится в той же папке, где скрипт)
# sys.stdout = open("debug_log.txt", "w")
# sys.stderr = sys.stdout

# model_path = "mi8_colored_base_yellow.glb"

# # 1) Очищаем сцену и импортируем модель
# bpy.ops.object.select_all(action='SELECT')
# bpy.ops.object.delete(use_global=False)
# bpy.ops.import_scene.gltf(filepath=model_path)

# print("=== Список всех объектов после импорта ===")
# for obj in bpy.data.objects:
#     print("  •", obj.name)

# # 2) Ищем точное имя заднего винта
# rotor_name = "zad.vint"  # если этого имени нет, посмотрите в списке выше и замените его
# rotor = bpy.data.objects.get(rotor_name)

# if not rotor:
#     print(f"\nОбъект '{rotor_name}' не найден среди перечисленных выше.")
#     print("Вам нужно скопировать точно одно из имён из списка и вставить вместо 'zad.vint'.")
# else:
#     print(f"\nНайден объект '{rotor_name}'. Будем пробовать поставить 1 ключ вращения.")

#     # 3) Устанавливаем режим quaternion
#     rotor.rotation_mode = 'QUATERNION'
#     bpy.context.view_layer.objects.active = rotor
#     rotor.select_set(True)

#     # Проверяем, есть ли у него animation_data до вставки ключей
#     print("До вставки ключей: rotor.animation_data =", rotor.animation_data)
#     print("До вставки ключей: rotor.animation_data.action =", None if rotor.animation_data is None else rotor.animation_data.action)

#     # Ставим первый ключ (identity quaternion) на кадре 1
#     bpy.context.scene.frame_start = 1
#     bpy.context.scene.frame_end = 1
#     bpy.context.scene.frame_set(1)
#     rotor.rotation_quaternion = mathutils.Quaternion((1, 0, 0, 0))
#     rotor.keyframe_insert(data_path="rotation_quaternion", frame=1)

#     # Проверяем, создалась ли анимация и action
#     print("\nПосле вставки ключа на кадре 1:")
#     print("  rotor.animation_data =", rotor.animation_data)
#     if rotor.animation_data:
#         print("  rotor.animation_data.action =", rotor.animation_data.action)
#         if rotor.animation_data.action:
#             print("    Длина кривых (fcurves):", len(rotor.animation_data.action.fcurves))
#     else:
#         print("  Отсутствует animation_data у объекта после keyframe_insert!")

#     # 4) Если action создана, пробуем добавить ещё один ключ для 360° вокруг локальной Z
#     if rotor.animation_data and rotor.animation_data.action:
#         bpy.context.scene.frame_start = 1
#         bpy.context.scene.frame_end = 60
#         bpy.context.scene.frame_set(60)

#         axis_vec = (0, 0, 1)  # локальная ось Z
#         angle = 2 * 3.141592653589793  # 360°
#         rotor.rotation_quaternion = mathutils.Quaternion(axis_vec, angle)
#         rotor.keyframe_insert(data_path="rotation_quaternion", frame=60)

#         print("\nПосле вставки ключа на кадре 60:")
#         print("  Количество fcurves теперь:", len(rotor.animation_data.action.fcurves))
#         for idx, fcurve in enumerate(rotor.animation_data.action.fcurves):
#             print(f"    fcurve[{idx}].data_path = '{fcurve.data_path}', количество ключей = {len(fcurve.keyframe_points)}")

#     else:
#         print("\nНе удалось создать action для объекта, проверьте имя или трансформации.")

# # 5) Экспорт (можно закомментировать, если проверка достаточно)
# # bpy.ops.export_scene.gltf(filepath="debug_export.glb", export_animations=True)
# # print("\nЭкспорт завершён: файл debug_export.glb")

# print("\n=== Конец проверки ===")
# sys.stdout.close()
# import bpy
# import math
# import mathutils

# # 1) НЕ МЕНЯЕМ путь к модели
# model_path = "mi8_colored_base_yellow.glb"

# # 2) Полностью очищаем сцену
# bpy.ops.object.select_all(action='SELECT')
# bpy.ops.object.delete(use_global=False)

# # 3) Импортируем вашу модель
# bpy.ops.import_scene.gltf(filepath=model_path)

# # 4) Настраиваем параметры анимации

# #   - Главный ротор ("lopocty"): quaternion-анимация по локальной оси Y (ось=1)
# #   - Задний винт  ("zad.vint"): Euler-анимация по локальной оси X (ось=0)
# rotors_quat = {
#     "lopocty": (1, 1),    # (ось, направление) — ось=1 (Y), направление=+1
# }
# rotors_euler = {
#     "zad.vint": (0, 1),   # (ось, направление) — ось=0 (X), направление=+1
# }

# # 5) Задаём диапазон всей анимации
# bpy.context.scene.frame_start = 1
# bpy.context.scene.frame_end   = 60

# # --- 5a) Анимация главного ротора через Quaternion ---
# for rotor_name, (axis, direction) in rotors_quat.items():
#     rotor = bpy.data.objects.get(rotor_name)
#     if not rotor:
#         print(f"Главный ротор '{rotor_name}' не найден, пропускаем")
#         continue

#     # Переводим в режим quaternion
#     rotor.rotation_mode = 'QUATERNION'
#     bpy.context.view_layer.objects.active = rotor
#     rotor.select_set(True)

#     # Ключевой кадр 1: без вращения (identity quaternion)
#     bpy.context.scene.frame_set(1)
#     rotor.rotation_quaternion = mathutils.Quaternion((1, 0, 0, 0))
#     rotor.keyframe_insert(data_path="rotation_quaternion", frame=1)

#     # Ключевой кадр 60: поворот 360° вокруг локальной оси Y
#     axis_map = {0: (1, 0, 0), 1: (0, 1, 0), 2: (0, 0, 1)}
#     axis_vec = axis_map[axis]
#     bpy.context.scene.frame_set(60)
#     rot_quat = mathutils.Quaternion(axis_vec, direction * 2 * math.pi)
#     rotor.rotation_quaternion = rot_quat
#     rotor.keyframe_insert(data_path="rotation_quaternion", frame=60)

#     # Линейная интерполяция и зацикливание
#     action = rotor.animation_data.action
#     for fcurve in action.fcurves:
#         for kp in fcurve.keyframe_points:
#             kp.interpolation = 'LINEAR'
#         mod = fcurve.modifiers.new(type='CYCLES')
#         mod.mode_before = 'REPEAT'
#         mod.mode_after  = 'REPEAT'

# # --- 5b) Анимация заднего винта через Euler ---
# for rotor_name, (axis, direction) in rotors_euler.items():
#     rotor = bpy.data.objects.get(rotor_name)
#     if not rotor:
#         print(f"Задний винт '{rotor_name}' не найден, пропускаем")
#         continue

#     # Переводим в режим Euler (XYZ)
#     rotor.rotation_mode = 'XYZ'
#     bpy.context.view_layer.objects.active = rotor
#     rotor.select_set(True)

#     # Ключевой кадр 1: (0,0,0)
#     bpy.context.scene.frame_set(1)
#     rotor.rotation_euler = (0.0, 0.0, 0.0)
#     rotor.keyframe_insert(data_path="rotation_euler", frame=1)

#     # Ключевой кадр 60: поворот 360° вокруг локальной X (ось=0)
#     bpy.context.scene.frame_set(60)
#     rot = [0.0, 0.0, 0.0]
#     rot[axis] = direction * 2 * math.pi  # axis=0 → X, т.е. rot[0]=2π
#     rotor.rotation_euler = tuple(rot)
#     rotor.keyframe_insert(data_path="rotation_euler", frame=60)

#     # Линейная интерполяция и зацикливание
#     action = rotor.animation_data.action
#     for fcurve in action.fcurves:
#         for kp in fcurve.keyframe_points:
#             kp.interpolation = 'LINEAR'
#         mod = fcurve.modifiers.new(type='CYCLES')
#         mod.mode_before = 'REPEAT'
#         mod.mode_after  = 'REPEAT'

# # 6) Экспортируем готовую анимацию
# output_path = "mi8_colored_base_yellow_animated.glb"
# bpy.ops.export_scene.gltf(filepath=output_path, export_animations=True)

# print(f"Анимация создана и сохранена в «{output_path}»")




# import bpy
# import math
# import mathutils

# # 1) Не меняем путь к модели
# model_path = "mi8_colored_base_yellow.glb"

# # 2) Полностью очищаем сцену
# bpy.ops.object.select_all(action='SELECT')
# bpy.ops.object.delete(use_global=False)

# # 3) Импортируем GLB
# bpy.ops.import_scene.gltf(filepath=model_path)

# # 4) Названия наших роторов
# main_rotor_name = "lopocty"
# tail_rotor_name = "zad.vint"

# # 5) Сначала правильно выставим origin (pivot) для заднего винта
# tail = bpy.data.objects.get(tail_rotor_name)
# if tail:
#     bpy.context.view_layer.objects.active = tail
#     tail.select_set(True)
#     # Устанавливаем точку вращения в центр геометрии
#     bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_VOLUME', center='MEDIAN')
#     tail.select_set(False)
# else:
#     print(f"В сцене не найден объект '{tail_rotor_name}', origin для заднего винта не установлен.")

# # 6) Теперь задаём диапазон анимации
# bpy.context.scene.frame_start = 1
# bpy.context.scene.frame_end   = 60

# # 7) Анимируем главный ротор (lopocty) через quaternion вокруг локальной оси Y
# main = bpy.data.objects.get(main_rotor_name)
# if main:
#     main.rotation_mode = 'QUATERNION'
#     bpy.context.view_layer.objects.active = main
#     main.select_set(True)

#     bpy.context.scene.frame_set(1)
#     main.rotation_quaternion = mathutils.Quaternion((1, 0, 0, 0))
#     main.keyframe_insert(data_path="rotation_quaternion", frame=1)

#     bpy.context.scene.frame_set(60)
#     # Локальная ось Y = (0,1,0)
#     rot_quat = mathutils.Quaternion((0, 1, 0), 2 * math.pi)
#     main.rotation_quaternion = rot_quat
#     main.keyframe_insert(data_path="rotation_quaternion", frame=60)

#     # Линейная интерполяция и зацикливание
#     action = main.animation_data.action
#     for fcurve in action.fcurves:
#         for kp in fcurve.keyframe_points:
#             kp.interpolation = 'LINEAR'
#         mod = fcurve.modifiers.new(type='CYCLES')
#         mod.mode_before = 'REPEAT'
#         mod.mode_after  = 'REPEAT'
#     main.select_set(False)
# else:
#     print(f"Главный ротор '{main_rotor_name}' не найден, анимация не создана.")

# # 8) Анимируем задний винт (zad.vint) через Euler вокруг локальной оси X
# tail = bpy.data.objects.get(tail_rotor_name)
# if tail:
#     tail.rotation_mode = 'XYZ'
#     bpy.context.view_layer.objects.active = tail
#     tail.select_set(True)

#     bpy.context.scene.frame_set(1)
#     tail.rotation_euler = (0.0, 0.0, 0.0)
#     tail.keyframe_insert(data_path="rotation_euler", frame=1)

#     bpy.context.scene.frame_set(60)
#     # Локальная ось X = индекс 0
#     rot = [0.0, 0.0, 0.0]
#     rot[0] = 2 * math.pi  # 360° вокруг X
#     tail.rotation_euler = tuple(rot)
#     tail.keyframe_insert(data_path="rotation_euler", frame=60)

#     # Линейная интерполяция и зацикливание
#     action = tail.animation_data.action
#     for fcurve in action.fcurves:
#         for kp in fcurve.keyframe_points:
#             kp.interpolation = 'LINEAR'
#         mod = fcurve.modifiers.new(type='CYCLES')
#         mod.mode_before = 'REPEAT'
#         mod.mode_after  = 'REPEAT'
#     tail.select_set(False)
# else:
#     print(f"Задний винт '{tail_rotor_name}' не найден, анимация не создана.")

# # 9) Экспортируем итоговую модель с анимацией
# output_path = "test.glb"
# bpy.ops.export_scene.gltf(filepath=output_path, export_animations=True)

# print(f"Анимация создана и сохранена в «{output_path}»")




# import bpy
# import math
# import mathutils

# # 1) Путь к модели (оставляем без изменений)
# model_path = "mi8_colored_base_yellow.glb"

# # 2) Полностью очищаем сцену
# bpy.ops.object.select_all(action='SELECT')
# bpy.ops.object.delete(use_global=False)

# # 3) Импортируем GLB
# bpy.ops.import_scene.gltf(filepath=model_path)

# # 4) Названия роторов
# main_rotor_name = "lopocty"   # главный ротор
# tail_rotor_name = "zad.vint"  # задний винт

# # 5) Устанавливаем origin (pivot) для заднего винта в центр его геометрии,
# #    чтобы при вращении лопасти не «гуляли» вокруг неверной точки
# tail = bpy.data.objects.get(tail_rotor_name)
# if tail:
#     bpy.context.view_layer.objects.active = tail
#     tail.select_set(True)
#     bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_VOLUME', center='MEDIAN')
#     tail.select_set(False)
# else:
#     print(f"Объект '{tail_rotor_name}' не найден — origin не установлен.")

# # 6) Настраиваем диапазон кадров
# bpy.context.scene.frame_start = 1
# bpy.context.scene.frame_end   = 60

# # 7) Анимация главного ротора (lopocty) через Quaternion вокруг локальной оси Y
# main = bpy.data.objects.get(main_rotor_name)
# if main:
#     main.rotation_mode = 'QUATERNION'
#     bpy.context.view_layer.objects.active = main
#     main.select_set(True)

#     # Ключ на кадре 1: identity quaternion (нулевое вращение)
#     bpy.context.scene.frame_set(1)
#     main.rotation_quaternion = mathutils.Quaternion((1, 0, 0, 0))
#     main.keyframe_insert(data_path="rotation_quaternion", frame=1)

#     # Ключ на кадре 60: полный оборот 360° вокруг локальной оси Y
#     axis_vec = (0, 1, 0)  # локальная ось Y
#     bpy.context.scene.frame_set(60)
#     rot_quat = mathutils.Quaternion(axis_vec, 2 * math.pi)
#     main.rotation_quaternion = rot_quat
#     main.keyframe_insert(data_path="rotation_quaternion", frame=60)

#     # Линейная интерполяция и зацикливание
#     action = main.animation_data.action
#     for fcurve in action.fcurves:
#         for kp in fcurve.keyframe_points:
#             kp.interpolation = 'LINEAR'
#         mod = fcurve.modifiers.new(type='CYCLES')
#         mod.mode_before = 'REPEAT'
#         mod.mode_after  = 'REPEAT'
#     main.select_set(False)
# else:
#     print(f"Главный ротор '{main_rotor_name}' не найден — анимация не создана.")

# # 8) Анимация заднего винта (zad.vint) через Euler вокруг локальной оси X
# tail = bpy.data.objects.get(tail_rotor_name)
# if tail:
#     tail.rotation_mode = 'XYZ'
#     bpy.context.view_layer.objects.active = tail
#     tail.select_set(True)

#     # Ключ на кадре 1: rotation_euler = (0,0,0)
#     bpy.context.scene.frame_set(1)
#     tail.rotation_euler = (0.0, 0.0, 0.0)
#     tail.keyframe_insert(data_path="rotation_euler", frame=1)

#     # Ключ на кадре 60: полный оборот 360° вокруг локальной оси X
#     bpy.context.scene.frame_set(60)
#     rot = [0.0, 0.0, 0.0]
#     rot[0] = 2 * math.pi  # локальная ось X
#     tail.rotation_euler = tuple(rot)
#     tail.keyframe_insert(data_path="rotation_euler", frame=60)

#     # Линейная интерполяция и зацикливание
#     action = tail.animation_data.action
#     for fcurve in action.fcurves:
#         for kp in fcurve.keyframe_points:
#             kp.interpolation = 'LINEAR'
#         mod = fcurve.modifiers.new(type='CYCLES')
#         mod.mode_before = 'REPEAT'
#         mod.mode_after  = 'REPEAT'
#     tail.select_set(False)
# else:
#     print(f"Задний винт '{tail_rotor_name}' не найден — анимация не создана.")

# # 9) Экспортируем готовую анимацию
# output_path = "test.glb"
# bpy.ops.export_scene.gltf(filepath=output_path, export_animations=True)

# print(f"Анимация главного ротора '{main_rotor_name}' и заднего винта '{tail_rotor_name}' создана и сохранена в «{output_path}»")


# import bpy
# import math
# import mathutils

# # 1) Путь к вашей модели (не меняем)
# model_path = "mi8_colored_base_yellow.glb"

# # 2) Полностью очищаем сцену
# bpy.ops.object.select_all(action='SELECT')
# bpy.ops.object.delete(use_global=False)

# # 3) Импортируем glTF-модель
# bpy.ops.import_scene.gltf(filepath=model_path)

# # 4) Названия роторов
# main_rotor_name = "lopocty"   # главный ротор
# tail_rotor_name = "zad.vint"  # задний винт

# # 5) Устанавливаем origin (pivot) для заднего винта в центр его геометрии
# tail = bpy.data.objects.get(tail_rotor_name)
# if tail:
#     bpy.context.view_layer.objects.active = tail
#     tail.select_set(True)
#     bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_VOLUME', center='MEDIAN')
#     tail.select_set(False)
# else:
#     print(f"Объект '{tail_rotor_name}' не найден — origin не установлен.")

# # 6) Настройка диапазона кадров для обеих анимаций
# bpy.context.scene.frame_start = 1
# bpy.context.scene.frame_end   = 60

# # ---- Анимация главного ротора (lopocty) через Euler вокруг локальной оси Y ----
# main = bpy.data.objects.get(main_rotor_name)
# if main:
#     main.rotation_mode = 'XYZ'
#     bpy.context.view_layer.objects.active = main
#     main.select_set(True)

#     # Кадр 1: начало (нулевое вращение)
#     bpy.context.scene.frame_set(1)
#     main.rotation_euler = (0.0, 0.0, 0.0)
#     main.keyframe_insert(data_path="rotation_euler", frame=1)

#     # Кадр 60: полный оборот 360° вокруг локальной оси Y (ось = индекс 1)
#     bpy.context.scene.frame_set(60)
#     rot_main = [0.0, 0.0, 0.0]
#     rot_main[1] = 2 * math.pi  # ось Y
#     main.rotation_euler = tuple(rot_main)
#     main.keyframe_insert(data_path="rotation_euler", frame=60)

#     # Линейная интерполяция и зацикливание
#     action_main = main.animation_data.action
#     for fcurve in action_main.fcurves:
#         for kp in fcurve.keyframe_points:
#             kp.interpolation = 'LINEAR'
#         mod = fcurve.modifiers.new(type='CYCLES')
#         mod.mode_before = 'REPEAT'
#         mod.mode_after  = 'REPEAT'
#     main.select_set(False)
# else:
#     print(f"Главный ротор '{main_rotor_name}' не найден — анимация не создана.")

# # ---- Анимация заднего винта (zad.vint) через Euler вокруг локальной оси X ----
# tail = bpy.data.objects.get(tail_rotor_name)
# if tail:
#     tail.rotation_mode = 'XYZ'
#     bpy.context.view_layer.objects.active = tail
#     tail.select_set(True)

#     # Кадр 1: начало (нулевое вращение)
#     bpy.context.scene.frame_set(1)
#     tail.rotation_euler = (0.0, 0.0, 0.0)
#     tail.keyframe_insert(data_path="rotation_euler", frame=1)

#     # Кадр 60: полный оборот 360° вокруг локальной оси X (ось = индекс 0)
#     bpy.context.scene.frame_set(60)
#     rot_tail = [0.0, 0.0, 0.0]
#     rot_tail[0] = 2 * math.pi  # ось X
#     tail.rotation_euler = tuple(rot_tail)
#     tail.keyframe_insert(data_path="rotation_euler", frame=60)

#     # Линейная интерполяция и зацикливание
#     action_tail = tail.animation_data.action
#     for fcurve in action_tail.fcurves:
#         for kp in fcurve.keyframe_points:
#             kp.interpolation = 'LINEAR'
#         mod = fcurve.modifiers.new(type='CYCLES')
#         mod.mode_before = 'REPEAT'
#         mod.mode_after  = 'REPEAT'
#     tail.select_set(False)
# else:
#     print(f"Задний винт '{tail_rotor_name}' не найден — анимация не создана.")

# # 7) Экспорт итоговой анимированной модели
# output_path = "test.glb"
# bpy.ops.export_scene.gltf(filepath=output_path, export_animations=True)

# print(f"Анимация главного ротора '{main_rotor_name}' и заднего винта '{tail_rotor_name}' " +
#       f"создана и сохранена в «{output_path}»")


import bpy
import math
import mathutils

# 1) Задаём путь к вашей модели (не меняем)
model_path = "mi8_colored_base_yellow.glb"

# 2) Полностью очищаем сцену
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# 3) Импортируем GLB по указанному пути
bpy.ops.import_scene.gltf(filepath=model_path)

# === Смена базового цвета объекта 'lopocty' на #09134D ===

# Функция для перевода HEX → RGBA
def hex_to_rgba(hex_str):
    hex_str = hex_str.lstrip('#')
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    return (r, g, b, 1.0)

# 4) Попробуем найти объект 'lopocty'
main_obj = bpy.data.objects.get("lopocty")

# 5) Если его нет или у него нет материала, ищем любой объект с материалом
if main_obj is None or main_obj.data is None or not hasattr(main_obj.data, 'materials'):
    main_obj = None
    for obj in bpy.data.objects:
        if obj.data is not None and hasattr(obj.data, 'materials') and len(obj.data.materials) > 0:
            main_obj = obj
            break

# 6) Если нашёлся, меняем базовый цвет первого материала (учитываем нодовую систему)
if main_obj is None:
    print("Не найден ни один объект с материалом — не меняем цвет.")
else:
    print(f"Меняем цвет у объекта '{main_obj.name}'")
    if main_obj.data and hasattr(main_obj.data, 'materials') and len(main_obj.data.materials) > 0:
        mat = main_obj.data.materials[0]
        if mat and mat.node_tree:
            principled_node = None
            for node in mat.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED':
                    principled_node = node
                    break

            if principled_node:
                dark_blue = hex_to_rgba("09134D")
                principled_node.inputs['Base Color'].default_value = dark_blue
                print(f"Материал '{mat.name}': Base Color установлен в {dark_blue}")
            else:
                print(f"В материале '{mat.name}' не найден нод Principled BSDF.")
        else:
            print(f"У объекта '{main_obj.name}' нет активного материала с нодами.")
    else:
        print(f"У объекта '{main_obj.name}' нет материалов.")

# === Анимация роторов ===

# 7) Названия роторов
main_rotor_name = "lopocty"   # главный ротор
tail_rotor_name = "zad.vint"  # задний винт

# 8) Устанавливаем origin для заднего винта
tail = bpy.data.objects.get(tail_rotor_name)
if tail:
    bpy.context.view_layer.objects.active = tail
    tail.select_set(True)
    bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_VOLUME', center='MEDIAN')
    tail.select_set(False)
else:
    print(f"Задний винт '{tail_rotor_name}' не найден — origin не установлен.")

# 9) Диапазон кадров для анимации
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end   = 60

# 10) Анимация главного ротора через Euler вокруг локальной оси Y
main = bpy.data.objects.get(main_rotor_name)
if main:
    main.rotation_mode = 'XYZ'
    bpy.context.view_layer.objects.active = main
    main.select_set(True)

    bpy.context.scene.frame_set(1)
    main.rotation_euler = (0.0, 0.0, 0.0)
    main.keyframe_insert(data_path="rotation_euler", frame=1)

    bpy.context.scene.frame_set(60)
    rot_main = [0.0, 0.0, 0.0]
    rot_main[1] = 2 * math.pi  # ось Y
    main.rotation_euler = tuple(rot_main)
    main.keyframe_insert(data_path="rotation_euler", frame=60)

    action_main = main.animation_data.action
    for fcurve in action_main.fcurves:
        for kp in fcurve.keyframe_points:
            kp.interpolation = 'LINEAR'
        mod = fcurve.modifiers.new(type='CYCLES')
        mod.mode_before = 'REPEAT'
        mod.mode_after  = 'REPEAT'
    main.select_set(False)
else:
    print(f"Главный ротор '{main_rotor_name}' не найден — анимация не создана.")

# 11) Анимация заднего винта через Euler вокруг локальной оси X
tail = bpy.data.objects.get(tail_rotor_name)
if tail:
    tail.rotation_mode = 'XYZ'
    bpy.context.view_layer.objects.active = tail
    tail.select_set(True)

    bpy.context.scene.frame_set(1)
    tail.rotation_euler = (0.0, 0.0, 0.0)
    tail.keyframe_insert(data_path="rotation_euler", frame=1)

    bpy.context.scene.frame_set(60)
    rot_tail = [0.0, 0.0, 0.0]
    rot_tail[0] = 2 * math.pi  # ось X
    tail.rotation_euler = tuple(rot_tail)
    tail.keyframe_insert(data_path="rotation_euler", frame=60)

    action_tail = tail.animation_data.action
    for fcurve in action_tail.fcurves:
        for kp in fcurve.keyframe_points:
            kp.interpolation = 'LINEAR'
        mod = fcurve.modifiers.new(type='CYCLES')
        mod.mode_before = 'REPEAT'
        mod.mode_after  = 'REPEAT'
    tail.select_set(False)
else:
    print(f"Задний винт '{tail_rotor_name}' не найден — анимация не создана.")

# 12) Экспортируем итоговую модель с анимацией и цветом
output_path = "test.glb"
bpy.ops.export_scene.gltf(filepath=output_path, export_animations=True)

print(f"Готово! Файл сохранён как '{output_path}'")
