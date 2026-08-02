// Генератор классических сканвордов: слова пересекаются на сетке,
// подсказки лежат прямо в клетках рядом со словом. Без DOM-зависимостей —
// используется и в браузере (www/app.js), и в Node (scripts/build-puzzles.js).

var WORD_BANK = [
  // Природа
  { w: "СОЛНЦЕ", c: "Дневное светило" },
  { w: "ЛУНА", c: "Спутник Земли" },
  { w: "ЗВЕЗДА", c: "Ночной огонёк" },
  { w: "НЕБО", c: "Голубой простор" },
  { w: "ОБЛАКО", c: "Небесная вата" },
  { w: "ТУМАН", c: "Молочная пелена" },
  { w: "РАДУГА", c: "Цветная дуга" },
  { w: "ГРОМ", c: "Грохот в грозу" },
  { w: "МОЛНИЯ", c: "Небесная вспышка" },
  { w: "ВЕТЕР", c: "Движение воздуха" },
  { w: "ДОЖДЬ", c: "Капли с неба" },
  { w: "СНЕГ", c: "Белые хлопья" },
  { w: "ЛЁД", c: "Замёрзшая вода" },
  { w: "РЕКА", c: "Волга или Днепр" },
  { w: "ОЗЕРО", c: "Стоячий водоём" },
  { w: "МОРЕ", c: "Чёрное или Азовское" },
  { w: "ОКЕАН", c: "Величайший водоём" },
  { w: "ГОРА", c: "Эверест, например" },
  { w: "ХОЛМ", c: "Маленькая гора" },
  { w: "ЛЕС", c: "Много деревьев" },
  { w: "ПОЛЕ", c: "Простор под посев" },
  { w: "ПУСТЫНЯ", c: "Царство песка" },
  { w: "ОСТРОВ", c: "Земля среди воды" },
  { w: "ВОДОПАД", c: "Река с обрыва" },

  // Растения
  { w: "ДЕРЕВО", c: "Ствол с кроной" },
  { w: "ЦВЕТОК", c: "Дарят на праздник" },
  { w: "РОЗА", c: "Цветок с шипами" },
  { w: "ТРАВА", c: "Зелёный ковёр" },
  { w: "КУСТ", c: "Меньше дерева" },
  { w: "ЛИСТ", c: "Зелёная пластинка" },
  { w: "КОРЕНЬ", c: "Подземная часть" },
  { w: "СЕМЯ", c: "Зачаток растения" },
  { w: "ЯБЛОКО", c: "Плод для Ньютона" },
  { w: "ГРУША", c: "Фрукт-капля" },
  { w: "СЛИВА", c: "Тёмно-синий фрукт" },
  { w: "ВИШНЯ", c: "Ягода на косточке" },
  { w: "БАНАН", c: "Жёлтый изогнутый" },
  { w: "ЛИМОН", c: "Кислый жёлтый цитрус" },
  { w: "ВИНОГРАД", c: "Ягоды для вина" },
  { w: "АРБУЗ", c: "Полосатый гигант" },
  { w: "ДЫНЯ", c: "Сладкая бахчевая" },
  { w: "МОРКОВЬ", c: "Оранжевый корнеплод" },
  { w: "КАРТОФЕЛЬ", c: "Второй хлеб" },
  { w: "ЛУК", c: "Слёзы на кухне" },
  { w: "ЧЕСНОК", c: "Гроза вампиров" },
  { w: "КАПУСТА", c: "Из неё делают щи" },
  { w: "ОГУРЕЦ", c: "Овощ для салата" },
  { w: "ПОМИДОР", c: "Красный сочный овощ" },
  { w: "ТЫКВА", c: "Символ Хэллоуина" },
  { w: "ОРЕХ", c: "В твёрдой скорлупе" },
  { w: "ГРИБ", c: "Лесной житель" },
  { w: "КЛУБНИКА", c: "Ягода с грядки" },
  { w: "МАЛИНА", c: "Ягода от простуды" },
  { w: "ПШЕНИЦА", c: "Злак для муки" },

  // Животные
  { w: "СОБАКА", c: "Друг человека" },
  { w: "КОШКА", c: "Мурлычет на коленях" },
  { w: "ЛОШАДЬ", c: "Скачут верхом" },
  { w: "КОРОВА", c: "Даёт молоко" },
  { w: "СВИНЬЯ", c: "Хрюшка на ферме" },
  { w: "ОВЦА", c: "Даёт шерсть" },
  { w: "КОЗА", c: "Рогатая с бородкой" },
  { w: "КУРИЦА", c: "Несёт яйца" },
  { w: "ПЕТУХ", c: "Будит криком" },
  { w: "УТКА", c: "Крякает в пруду" },
  { w: "ГУСЬ", c: "Шипит и щиплется" },
  { w: "КРОЛИК", c: "Ушастый символ Пасхи" },
  { w: "МЫШЬ", c: "Серый грызун" },
  { w: "ВОЛК", c: "Воет на луну" },
  { w: "ЛИСА", c: "Рыжая, хитрая" },
  { w: "МЕДВЕДЬ", c: "Спит зимой в берлоге" },
  { w: "ЗАЯЦ", c: "Косой, длинноухий" },
  { w: "ОЛЕНЬ", c: "Ветвистые рога" },
  { w: "БЕЛКА", c: "Рыжая с дерева" },
  { w: "ЁЖ", c: "Колючий зверёк" },
  { w: "ТИГР", c: "Полосатая кошка" },
  { w: "ЛЕВ", c: "Царь зверей" },
  { w: "СЛОН", c: "Крупнейший на суше" },
  { w: "ЖИРАФ", c: "Самая длинная шея" },
  { w: "ЗЕБРА", c: "Полосатая лошадь" },
  { w: "ОБЕЗЬЯНА", c: "Родич человека" },
  { w: "ЧЕРЕПАХА", c: "Носит дом на себе" },
  { w: "ЗМЕЯ", c: "Ползает без ног" },
  { w: "ЛЯГУШКА", c: "Квакает у пруда" },
  { w: "ПТИЦА", c: "Летает и поёт" },
  { w: "РЫБА", c: "Живёт в воде" },
  { w: "АКУЛА", c: "Хищник морей" },
  { w: "ДЕЛЬФИН", c: "Умный морской житель" },
  { w: "КИТ", c: "Гигант морей" },
  { w: "ОРЁЛ", c: "Гордая хищница" },
  { w: "СОВА", c: "Ночная хищница" },
  { w: "ВОРОНА", c: "Чёрная городская" },
  { w: "ВОРОБЕЙ", c: "Серый непоседа" },
  { w: "ПОПУГАЙ", c: "Говорящая птица" },
  { w: "ПЧЕЛА", c: "Даёт мёд и жалит" },
  { w: "БАБОЧКА", c: "Бывшая гусеница" },
  { w: "ПАУК", c: "Плетёт паутину" },

  // Дом и быт
  { w: "ДОМ", c: "Жильё семьи" },
  { w: "ОКНО", c: "Стеклянный проём" },
  { w: "ДВЕРЬ", c: "Вход в квартиру" },
  { w: "СТЕНА", c: "Опора дома" },
  { w: "КРЫША", c: "Верх дома" },
  { w: "ПОТОЛОК", c: "Верх комнаты" },
  { w: "ЛЕСТНИЦА", c: "Ведёт на этаж" },
  { w: "КУХНЯ", c: "Комната для готовки" },
  { w: "СТОЛ", c: "За ним обедают" },
  { w: "СТУЛ", c: "На нём сидят" },
  { w: "КРОВАТЬ", c: "На ней спят" },
  { w: "ДИВАН", c: "Мягкое место для сна" },
  { w: "ШКАФ", c: "Хранит одежду" },
  { w: "ПОЛКА", c: "На неё ставят книги" },
  { w: "ЗЕРКАЛО", c: "Правду скажет" },
  { w: "ЛАМПА", c: "Даёт свет в комнате" },
  { w: "СВЕЧА", c: "Горит с фитилём" },
  { w: "КЛЮЧ", c: "Открывает замок" },
  { w: "ЗАМОК", c: "Запирает дверь" },
  { w: "КОВЁР", c: "Лежит на полу" },
  { w: "ШТОРА", c: "Закрывает окно" },
  { w: "ПОДУШКА", c: "Кладут под голову" },
  { w: "ОДЕЯЛО", c: "Укрывают во сне" },
  { w: "ТАРЕЛКА", c: "С неё едят" },
  { w: "ЧАШКА", c: "Из неё пьют чай" },
  { w: "ЛОЖКА", c: "Ей едят суп" },
  { w: "ВИЛКА", c: "Ей едят второе" },
  { w: "НОЖ", c: "Режущий прибор" },

  // Еда и напитки
  { w: "ХЛЕБ", c: "Всему голова" },
  { w: "МАСЛО", c: "Мажут на хлеб" },
  { w: "СЫР", c: "С дырками внутри" },
  { w: "МОЛОКО", c: "Напиток от коровы" },
  { w: "ЯЙЦО", c: "Несёт курица" },
  { w: "МЯСО", c: "Продукт из животного" },
  { w: "СУП", c: "Жидкое первое блюдо" },
  { w: "КАША", c: "Блюдо из крупы" },
  { w: "САЛАТ", c: "Овощная нарезка" },
  { w: "ПИРОГ", c: "Выпечка с начинкой" },
  { w: "ТОРТ", c: "Праздничная выпечка" },
  { w: "КОНФЕТА", c: "Сладость в обёртке" },
  { w: "ШОКОЛАД", c: "Сладкая плитка какао" },
  { w: "САХАР", c: "Белая сладость" },
  { w: "СОЛЬ", c: "Добывают в шахтах" },
  { w: "ПЕРЕЦ", c: "Острая приправа" },
  { w: "МЁД", c: "Сладкий продукт пчёл" },
  { w: "ЧАЙ", c: "Заварной напиток" },
  { w: "КОФЕ", c: "Бодрящий напиток" },
  { w: "СОК", c: "Напиток из фруктов" },

  // Одежда
  { w: "РУБАШКА", c: "На пуговицах" },
  { w: "ПЛАТЬЕ", c: "Женская одежда" },
  { w: "ЮБКА", c: "Ниже пояса" },
  { w: "БРЮКИ", c: "Штаны" },
  { w: "КУРТКА", c: "Теплее рубашки" },
  { w: "ПАЛЬТО", c: "На зиму сверху" },
  { w: "ШАПКА", c: "Головной убор" },
  { w: "ШАРФ", c: "Вокруг шеи" },
  { w: "НОСКИ", c: "Перед обувью" },
  { w: "БОТИНКИ", c: "Обувь на шнурках" },
  { w: "ТУФЛИ", c: "Нарядная обувь" },
  { w: "САПОГИ", c: "Обувь от непогоды" },
  { w: "РЕМЕНЬ", c: "Держит брюки" },
  { w: "ГАЛСТУК", c: "На шее делового" },
  { w: "КОСТЮМ", c: "Пиджак с брюками" },
  { w: "ПИЖАМА", c: "Одежда для сна" },

  // Транспорт
  { w: "МАШИНА", c: "Едет на колёсах" },
  { w: "АВТОБУС", c: "Транспорт для многих" },
  { w: "ПОЕЗД", c: "Идёт по рельсам" },
  { w: "САМОЛЁТ", c: "Летает по небу" },
  { w: "КОРАБЛЬ", c: "Плывёт по морю" },
  { w: "ЛОДКА", c: "Судёнышко с вёслами" },
  { w: "ВЕЛОСИПЕД", c: "Едет на педалях" },
  { w: "МОТОЦИКЛ", c: "Байк с мотором" },
  { w: "ТАКСИ", c: "Машина по вызову" },
  { w: "МЕТРО", c: "Подземный транспорт" },
  { w: "ТРАМВАЙ", c: "По рельсам в городе" },
  { w: "РАКЕТА", c: "Летит в космос" },

  // Профессии
  { w: "ВРАЧ", c: "Лечит людей" },
  { w: "УЧИТЕЛЬ", c: "Ведёт уроки" },
  { w: "ИНЖЕНЕР", c: "Проектирует здания" },
  { w: "ПОВАР", c: "Готовит в ресторане" },
  { w: "АКТЁР", c: "Играет роли в кино" },
  { w: "ПЕВЕЦ", c: "Исполняет песни" },
  { w: "ХУДОЖНИК", c: "Рисует картины" },
  { w: "ПИСАТЕЛЬ", c: "Сочиняет книги" },
  { w: "МУЗЫКАНТ", c: "Играет на инструменте" },
  { w: "ВОДИТЕЛЬ", c: "Управляет машиной" },
  { w: "ПИЛОТ", c: "Управляет самолётом" },
  { w: "МОРЯК", c: "Служит на корабле" },
  { w: "СОЛДАТ", c: "Служит в армии" },
  { w: "ФЕРМЕР", c: "Разводит скот" },
  { w: "ПРОДАВЕЦ", c: "Работает в магазине" },
  { w: "ЮРИСТ", c: "Знаток законов" },
  { w: "ПРОГРАММИСТ", c: "Пишет код" },
  { w: "ФОТОГРАФ", c: "Делает снимки" },

  // Части тела
  { w: "ГОЛОВА", c: "Верхняя часть тела" },
  { w: "ГЛАЗ", c: "Орган зрения" },
  { w: "УХО", c: "Орган слуха" },
  { w: "НОС", c: "Орган обоняния" },
  { w: "РОТ", c: "Им едят и говорят" },
  { w: "ЗУБ", c: "Им жуют пищу" },
  { w: "ЯЗЫК", c: "Орган вкуса во рту" },
  { w: "ШЕЯ", c: "Держит голову" },
  { w: "ПЛЕЧО", c: "Верх руки у шеи" },
  { w: "РУКА", c: "Ей берут предметы" },
  { w: "ПАЛЕЦ", c: "На руке их пять" },
  { w: "НОГА", c: "Ей ходят" },
  { w: "КОЛЕНО", c: "Сустав ноги" },
  { w: "СЕРДЦЕ", c: "Качает кровь" },
  { w: "ЖИВОТ", c: "Ниже груди" },
  { w: "СПИНА", c: "Задняя часть туловища" },

  // Спорт
  { w: "ФУТБОЛ", c: "Игра ногами с мячом" },
  { w: "ХОККЕЙ", c: "Игра с шайбой" },
  { w: "ТЕННИС", c: "Ракетка через сетку" },
  { w: "БОКС", c: "Бой в перчатках" },
  { w: "ШАХМАТЫ", c: "Битва на 64 клетках" },
  { w: "МЯЧ", c: "Круглый снаряд" },
  { w: "РАКЕТКА", c: "Для игры в теннис" },
  { w: "КОНЬКИ", c: "Обувь с лезвием" },
  { w: "ЛЫЖИ", c: "Скользят по снегу" },
  { w: "БАССЕЙН", c: "Место для плавания" },
  { w: "ФИНИШ", c: "Конец забега" },
  { w: "СТАРТ", c: "Начало забега" },

  // Наука и техника
  { w: "КОМПЬЮТЕР", c: "Умный ящик на столе" },
  { w: "ТЕЛЕФОН", c: "Для звонков" },
  { w: "ИНТЕРНЕТ", c: "Всемирная сеть" },
  { w: "РОБОТ", c: "Железный помощник" },
  { w: "СПУТНИК", c: "Кружит вокруг Земли" },
  { w: "АТОМ", c: "Частица вещества" },
  { w: "МИКРОСКОП", c: "Прибор для мелкого" },
  { w: "ТЕЛЕСКОП", c: "Прибор для звёзд" },
  { w: "БАТАРЕЯ", c: "Источник питания" },
  { w: "ПРОВОД", c: "По нему течёт ток" },
  { w: "ЭКРАН", c: "Показывает картинку" },
  { w: "КЛАВИАТУРА", c: "Печатают текст" },
  { w: "ПРИНТЕР", c: "Печатает на бумаге" },
  { w: "КАМЕРА", c: "Снимает фото и видео" },

  // Эмоции и абстракции
  { w: "РАДОСТЬ", c: "Приятное чувство" },
  { w: "ГРУСТЬ", c: "Печальное чувство" },
  { w: "СТРАХ", c: "Чувство при опасности" },
  { w: "ЛЮБОВЬ", c: "Сильное тёплое чувство" },
  { w: "ДРУЖБА", c: "Связь друзей" },
  { w: "СЧАСТЬЕ", c: "Высшая радость" },
  { w: "НАДЕЖДА", c: "Ожидание хорошего" },
  { w: "МЕЧТА", c: "Заветное желание" },
  { w: "ПАМЯТЬ", c: "Способность помнить" },
  { w: "ВРЕМЯ", c: "Измеряется часами" },
  { w: "СОН", c: "Ночной отдых" },
  { w: "ШУМ", c: "Беспорядочные звуки" },
  { w: "ТИШИНА", c: "Отсутствие звуков" },
  { w: "ПРАВДА", c: "Противоположность лжи" },

  // Искусство
  { w: "КАРТИНА", c: "Произведение живописи" },
  { w: "МУЗЫКА", c: "Искусство звуков" },
  { w: "ПЕСНЯ", c: "Мелодия со словами" },
  { w: "ТАНЕЦ", c: "Движения под музыку" },
  { w: "ТЕАТР", c: "Там играют спектакли" },
  { w: "КИНО", c: "Картинки на экране" },
  { w: "КНИГА", c: "Источник знаний" },
  { w: "СТИХИ", c: "Рифмованные строки" },
  { w: "СКРИПКА", c: "Струны со смычком" },
  { w: "ГИТАРА", c: "Струны и гриф" },
  { w: "ПИАНИНО", c: "Клавишный инструмент" },
  { w: "БАРАБАН", c: "Бьют палочками" },

  // Время
  { w: "УТРО", c: "Начало дня" },
  { w: "ДЕНЬ", c: "Светлое время суток" },
  { w: "ВЕЧЕР", c: "Время перед ночью" },
  { w: "НОЧЬ", c: "Тёмное время суток" },
  { w: "НЕДЕЛЯ", c: "Семь дней" },
  { w: "МЕСЯЦ", c: "Часть года" },
  { w: "ГОД", c: "Двенадцать месяцев" },
  { w: "ВЕСНА", c: "После зимы" },
  { w: "ЛЕТО", c: "Тёплое время года" },
  { w: "ОСЕНЬ", c: "Перед зимой" },
  { w: "ЗИМА", c: "Время года со снегом" },
  { w: "ЧАС", c: "Шестьдесят минут" },
  { w: "МИНУТА", c: "Шестьдесят секунд" },
  { w: "СЕКУНДА", c: "Меньше минуты" },

  // Формы и цвета
  { w: "КРУГ", c: "Фигура без углов" },
  { w: "КВАДРАТ", c: "Четыре ровных угла" },
  { w: "РОМБ", c: "Вытянутый квадрат" },
  { w: "КРАСНЫЙ", c: "Цвет крови" },
  { w: "СИНИЙ", c: "Цвет ясного неба" },
  { w: "ЖЁЛТЫЙ", c: "Цвет солнца" },
  { w: "ЗЕЛЁНЫЙ", c: "Цвет травы" },
  { w: "БЕЛЫЙ", c: "Цвет снега" },
  { w: "ЧЁРНЫЙ", c: "Цвет ночи" },

  // Люди и семья
  { w: "ДРУГ", c: "Близкий человек" },
  { w: "СЕМЬЯ", c: "Родители и дети" },
  { w: "МАМА", c: "Родительница" },
  { w: "ПАПА", c: "Родитель" },
  { w: "СЫН", c: "Мальчик в семье" },
  { w: "ДОЧЬ", c: "Девочка в семье" },
  { w: "БРАТ", c: "Родня-мужчина" },
  { w: "СЕСТРА", c: "Родня-женщина" },
  { w: "БАБУШКА", c: "Мать отца или матери" },
  { w: "ДЕДУШКА", c: "Отец отца или матери" },
  { w: "СОСЕД", c: "Живёт рядом" },
  { w: "ГОСТЬ", c: "Приходит в гости" },

  // Школа
  { w: "ШКОЛА", c: "Учебное заведение" },
  { w: "УЧЕНИК", c: "Тот, кто учится" },
  { w: "УРОК", c: "Занятие в школе" },
  { w: "ТЕТРАДЬ", c: "Пишут упражнения" },
  { w: "РУЧКА", c: "Пишущий предмет" },
  { w: "КАРАНДАШ", c: "Можно стереть" },
  { w: "ДОСКА", c: "Пишут мелом" },
  { w: "ПАРТА", c: "За ней сидят ученики" },
  { w: "ЗВОНОК", c: "Начало урока" },
  { w: "ЭКЗАМЕН", c: "Проверка знаний" },

  // Город
  { w: "ГОРОД", c: "Населённый пункт" },
  { w: "УЛИЦА", c: "Дорога среди домов" },
  { w: "ПЛОЩАДЬ", c: "Центр города" },
  { w: "ПАРК", c: "Деревья для прогулок" },
  { w: "МОСТ", c: "Соединяет берега" },
  { w: "ВОКЗАЛ", c: "Посадка на поезд" },
  { w: "МАГАЗИН", c: "Место покупок" },
  { w: "РЫНОК", c: "Торговля под небом" },
  { w: "БИБЛИОТЕКА", c: "Дом для книг" },
  { w: "МУЗЕЙ", c: "Дом экспонатов" },
  { w: "БОЛЬНИЦА", c: "Лечат больных" },
  { w: "АПТЕКА", c: "Продают лекарства" },
];

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function key(r, c) { return r + "," + c; }

function ScanwordGenerator(bank) {
  this.bank = bank;
  this.letterGrid = new Map(); // key -> { char, words: Set(id) }
  this.clueGrid = new Map();   // key -> { H:{text,arrow,wordId}, V:{...} }
  this.placed = [];            // { id, word, clue, r, c, dir, len }
  this.nextId = 1;
}

ScanwordGenerator.prototype.isLetter = function (r, c) { return this.letterGrid.has(key(r, c)); };

ScanwordGenerator.prototype.canPlace = function (word, r0, c0, dir) {
  var len = word.length;
  var before = dir === "H" ? [r0, c0 - 1] : [r0 - 1, c0];
  var after = dir === "H" ? [r0, c0 + len] : [r0 + len, c0];
  if (this.isLetter(before[0], before[1])) return false;
  if (this.isLetter(after[0], after[1])) return false;

  var intersections = 0;
  for (var i = 0; i < len; i++) {
    var r = dir === "H" ? r0 : r0 + i;
    var c = dir === "H" ? c0 + i : c0;
    var existing = this.letterGrid.get(key(r, c));
    if (existing) {
      if (existing.char !== word[i]) return false;
      intersections++;
    } else {
      if (this.clueGrid.has(key(r, c))) return false;
      var n1 = dir === "H" ? [r - 1, c] : [r, c - 1];
      var n2 = dir === "H" ? [r + 1, c] : [r, c + 1];
      if (this.isLetter(n1[0], n1[1])) return false;
      if (this.isLetter(n2[0], n2[1])) return false;
    }
  }
  if (intersections === 0 && this.placed.length > 0) return false;

  var cluePrimary = dir === "H" ? [r0, c0 - 1] : [r0 - 1, c0];
  var clueFallback = dir === "H" ? [r0, c0 + len] : [r0 + len, c0];
  var axis = dir === "H" ? "H" : "V";
  var primaryFree = !this.isLetter(cluePrimary[0], cluePrimary[1]) &&
    !(this.clueGrid.get(key(cluePrimary[0], cluePrimary[1])) || {})[axis];
  var fallbackFree = !this.isLetter(clueFallback[0], clueFallback[1]) &&
    !(this.clueGrid.get(key(clueFallback[0], clueFallback[1])) || {})[axis];
  if (!primaryFree && !fallbackFree) return false;

  return intersections;
};

ScanwordGenerator.prototype.place = function (entry, r0, c0, dir) {
  var word = entry.w, clue = entry.c;
  var len = word.length;
  var id = this.nextId++;
  for (var i = 0; i < len; i++) {
    var r = dir === "H" ? r0 : r0 + i;
    var c = dir === "H" ? c0 + i : c0;
    var k = key(r, c);
    var cell = this.letterGrid.get(k);
    if (!cell) { cell = { char: word[i], words: new Set() }; this.letterGrid.set(k, cell); }
    cell.words.add(id);
  }
  var axis = dir === "H" ? "H" : "V";
  var cluePrimary = dir === "H" ? [r0, c0 - 1] : [r0 - 1, c0];
  var clueFallback = dir === "H" ? [r0, c0 + len] : [r0 + len, c0];
  var primaryFree = !this.isLetter(cluePrimary[0], cluePrimary[1]) &&
    !(this.clueGrid.get(key(cluePrimary[0], cluePrimary[1])) || {})[axis];
  var pos = primaryFree ? cluePrimary : clueFallback;
  var cr = pos[0], cc = pos[1];
  var arrow = dir === "H" ? (primaryFree ? "right" : "left") : (primaryFree ? "down" : "up");
  var ck = key(cr, cc);
  var cslot = this.clueGrid.get(ck);
  if (!cslot) { cslot = {}; this.clueGrid.set(ck, cslot); }
  cslot[axis] = { text: clue, arrow: arrow, wordId: id };

  this.placed.push({ id: id, word: word, clue: clue, r: r0, c: c0, dir: dir, len: len });
};

ScanwordGenerator.prototype.findCandidates = function (entry) {
  var word = entry.w;
  var candidates = [];
  if (this.placed.length === 0) {
    candidates.push({ r0: 0, c0: 0, dir: "H", score: 0 });
    return candidates;
  }
  var cur = this.bounds();
  var curSpanR = cur.maxR - cur.minR, curSpanC = cur.maxC - cur.minC;
  for (var it = this.letterGrid.entries(), res; !(res = it.next()).done;) {
    var k = res.value[0], cell = res.value[1];
    var parts = k.split(","); var er = Number(parts[0]), ec = Number(parts[1]);
    for (var i = 0; i < word.length; i++) {
      if (word[i] !== cell.char) continue;
      var hCand = { r0: er, c0: ec - i, dir: "H" };
      var vCand = { r0: er - i, c0: ec, dir: "V" };
      [hCand, vCand].forEach((cand) => {
        var intersections = this.canPlace(word, cand.r0, cand.c0, cand.dir);
        if (intersections) {
          var endR = cand.dir === "V" ? cand.r0 + word.length - 1 : cand.r0;
          var endC = cand.dir === "H" ? cand.c0 + word.length - 1 : cand.c0;
          var newMinR = Math.min(cur.minR, cand.r0), newMaxR = Math.max(cur.maxR, endR);
          var newMinC = Math.min(cur.minC, cand.c0), newMaxC = Math.max(cur.maxC, endC);
          var growth = ((newMaxR - newMinR) - curSpanR) + ((newMaxC - newMinC) - curSpanC);
          var score = intersections * 1000 - growth * 20 + Math.random();
          candidates.push({ r0: cand.r0, c0: cand.c0, dir: cand.dir, score: score });
        }
      });
    }
  }
  return candidates;
};

ScanwordGenerator.prototype.bounds = function () {
  var minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  function consider(r, c) {
    if (r < minR) minR = r; if (r > maxR) maxR = r;
    if (c < minC) minC = c; if (c > maxC) maxC = c;
  }
  this.letterGrid.forEach((_v, k) => { var p = k.split(","); consider(Number(p[0]), Number(p[1])); });
  this.clueGrid.forEach((_v, k) => { var p = k.split(","); consider(Number(p[0]), Number(p[1])); });
  return { minR: minR, maxR: maxR, minC: minC, maxC: maxC };
};

ScanwordGenerator.prototype.undoLast = function () {
  var last = this.placed.pop();
  if (!last) return;
  for (var i = 0; i < last.len; i++) {
    var r = last.dir === "H" ? last.r : last.r + i;
    var c = last.dir === "H" ? last.c + i : last.c;
    var k = key(r, c);
    var cell = this.letterGrid.get(k);
    if (cell) { cell.words.delete(last.id); if (cell.words.size === 0) this.letterGrid.delete(k); }
  }
  this.clueGrid.forEach((slot, k) => {
    ["H", "V"].forEach((axis) => {
      if (slot[axis] && slot[axis].wordId === last.id) delete slot[axis];
    });
    if (!slot.H && !slot.V) this.clueGrid.delete(k);
  });
};

ScanwordGenerator.prototype.generate = function (targetCount, maxSpan) {
  var pool = shuffle(this.bank).sort(function (a, b) { return b.w.length - a.w.length; });
  for (var idx = 0; idx < pool.length; idx++) {
    var entry = pool[idx];
    if (this.placed.length >= targetCount) break;
    if (this.placed.some(function (p) { return p.word === entry.w; })) continue;
    var candidates = this.findCandidates(entry);
    if (!candidates.length) continue;
    candidates.sort(function (a, b) { return b.score - a.score; });
    var tryCount = Math.min(candidates.length, 5);
    for (var ci = 0; ci < tryCount; ci++) {
      var pick = candidates[ci];
      this.place(entry, pick.r0, pick.c0, pick.dir);
      if (maxSpan) {
        var b = this.bounds();
        if (b.maxR - b.minR >= maxSpan || b.maxC - b.minC >= maxSpan) {
          this.undoLast();
          continue;
        }
      }
      break;
    }
  }
  return this.placed.length;
};

// Собирает один пазл: сетка + список слов. Возвращает { rows, cols, grid, words, wordCount }.
function generatePuzzle(bank, targetWords, maxSpan) {
  targetWords = targetWords || 40;
  maxSpan = maxSpan || 26;
  var best = null;
  for (var attempt = 0; attempt < 25; attempt++) {
    var gen = new ScanwordGenerator(bank);
    gen.generate(targetWords, maxSpan);
    var b = gen.bounds();
    while ((b.maxR - b.minR >= maxSpan || b.maxC - b.minC >= maxSpan) && gen.placed.length > 0) {
      gen.undoLast();
      b = gen.bounds();
    }
    if (!best || gen.placed.length > best.placed.length) best = gen;
    if (gen.placed.length >= targetWords) break;
  }

  var bb = best.bounds();
  var rows = bb.maxR - bb.minR + 1;
  var cols = bb.maxC - bb.minC + 1;
  var grid = [];
  for (var r = 0; r < rows; r++) {
    var row = [];
    for (var c = 0; c < cols; c++) row.push({ type: "blocked" });
    grid.push(row);
  }

  best.letterGrid.forEach((cell, k) => {
    var p = k.split(","); var r = Number(p[0]), c = Number(p[1]);
    grid[r - bb.minR][c - bb.minC] = { type: "letter", char: cell.char, wordIds: Array.from(cell.words) };
  });
  best.clueGrid.forEach((slot, k) => {
    var p = k.split(","); var r = Number(p[0]), c = Number(p[1]);
    grid[r - bb.minR][c - bb.minC] = { type: "clue", H: slot.H || null, V: slot.V || null };
  });

  var words = best.placed.map(function (p) {
    return { id: p.id, word: p.word, clue: p.clue, dir: p.dir, len: p.len, r: p.r - bb.minR, c: p.c - bb.minC };
  });

  return { rows: rows, cols: cols, grid: grid, words: words, wordCount: words.length };
}

var ScanwordGen = { WORD_BANK: WORD_BANK, ScanwordGenerator: ScanwordGenerator, generatePuzzle: generatePuzzle };

if (typeof module !== "undefined" && module.exports) {
  module.exports = ScanwordGen;
} else {
  this.ScanwordGen = ScanwordGen;
}
