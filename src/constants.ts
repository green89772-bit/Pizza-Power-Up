export interface ScriptPart {
  text: string;
  pitch: number;
  rate: number;
}

export interface StudentScript {
  id: string;
  name: string;
  topic: string;
  title: string;
  scripts: ScriptPart[]; // 4 parts with emotional parameters
  loomUrl?: string;
}

export const STUDENTS: StudentScript[] = [
  {
    id: "sophia",
    name: "Sophia",
    topic: "Air Pollution",
    title: "Magic Sky Sophia",
    loomUrl: "https://www.loom.com/share/c1f55701246f4e43b8fc538cd472762f",
    scripts: [
      { text: "Hello everyone! My name is Sophia. Have you ever looked up at the Taichung sky ▲ and noticed it looks gray (↑) and blurry (↑)? That is air pollution ▲. It happens because there are too many ▲ factories and cars in our city. When I breathe this dirty air ▲, it makes me feel very angry ▲ and sad ▲ for our Earth ▲.", pitch: 1.1, rate: 1.0 },
      { text: "During my Chinese New Year holiday, I went to an amusement park. Right next to the park, I saw a factory burning trash ▲. The thick smoke ▲ smelled terrible and the air felt very heavy ▲. It made me realize that our Earth is sick ▲, and I knew I had to help ▲.", pitch: 0.9, rate: 0.9 },
      { text: "I decided to start a scientific mission ▲. Every single day ▲, I check the AQI (Air Quality Index). I record the numbers and make a line graph to track the changes. If I do this every day, I can show everyone how our air changes (↑) over time. In one year ▲, that is 184 times ▲ I am helping the air stay important (↑)!", pitch: 1.2, rate: 1.1 },
      { text: "My family also started \"Eco-Friendly Days\" ▲. Now, instead of driving, we ride our bikes ▲ to the library and the sports center. It is tiring (↑), but I love hearing my family’s laughter ▲ while we exercise. Every Saturday ▲ is our \"Family Sports Day\". After we finish our workout, my brother and I make fresh fruit juice ▲ together. It is so delicious (↑) and healthy ▲! I want our Earth to be healthy again ▲. So, next time you go out ▲, please ride a bike ▲ or walk more ▲. Let’s help Taichung breathe together ▲. Thank you ▲!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "linus",
    name: "Linus",
    topic: "Stray Animals",
    title: "Animal Hero Linus",
    loomUrl: "https://www.loom.com/share/b4d6648e2a434cd8beb90fdf013e69f5",
    scripts: [
      { text: "Hello everyone! My name is Linus. Today, I want to talk about our \"furry neighbors\"—the stray animals of Taichung. During my winter vacation, I rode my bike to a friend’s house, and I saw something on the street that changed my heart forever.", pitch: 1.1, rate: 1.0 },
      { text: "On my way, I saw stray dogs and cats everywhere. They were so thin, weak, and lonely. I saw one dog searching for food in a very dirty trash can! At the local market, a small cat was trying to grab a fish from a stall because it was so hungry. These animals have to fight every day just to survive.", pitch: 0.8, rate: 0.85 },
      { text: "Look at these animals; the life of a stray is very difficult. Many of them are dirty and smelly because they have no home. I even saw some dogs with missing legs or old scars from accidents. When the wind is cold at night, they have to huddle together just to stay warm. It breaks my heart to see them suffering like this.", pitch: 0.9, rate: 0.9 },
      { text: "We must remember that these animals were once someone's beloved pets. They are not trash! They are living things with feelings. My mission is to tell everyone: Please, do not abandon your dogs or cats. If you want a pet, please choose to adopt a stray from a shelter instead of buying one. A great city like Taichung must be a kind city. Let’s make our home safe for all animals. If you see a stray, please be kind to them. Thank you for listening!", pitch: 1.1, rate: 1.0 }
    ]
  },
  {
    id: "robben",
    name: "Robben",
    topic: "Packaging Waste",
    title: "Eco Warrior Robben",
    loomUrl: "https://www.loom.com/share/14d8f6c44ed648f0aa06328869d007f7",
    scripts: [
      { text: "Hello everyone! My name is Robben. Today, I want to talk about a hidden problem in Taichung. During my winter vacation, I saw something scary: mountains of packaging from online shopping parcels. It made me realize that our planet is being buried in plastic and paper.", pitch: 1.1, rate: 1.0 },
      { text: "I also saw people throwing trash on the ground in our local parks. It made me feel very unhappy and worried. I didn't just walk away; I decided to take action. I picked up the litter and took it home to throw it away properly. We must stop littering because Taichung is our beautiful home!", pitch: 0.9, rate: 0.95 },
      { text: "I asked my mom: \"Why do parcels have so much extra packaging?\" She told me it is to protect the things inside. But I told her, \"This creates too much trash!\" If we protect our new toys but destroy our Earth, that is a big mistake. We need to find a better way to shop.", pitch: 1.2, rate: 1.1 },
      { text: "I started a mission to count the packaging for every parcel we receive. I found so much plastic and tape that we didn't actually need! Now, my family has a new rule: we will stop buying so many parcels. By buying less, we create less waste for the city. It is a simple way for a kid like me to be a hero for the environment. Small actions, like picking up trash or ordering fewer parcels, can save our city from pollution. Let’s keep Taichung clean and beautiful together for our future. Thank you!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "eason",
    name: "Eason",
    topic: "Food Waste",
    title: "Food Saver Eason",
    scripts: [
      { text: "Hello everyone! My name is Eason. Have you ever thought about where your food goes after you throw it away? Today, I want to talk to you about a very big problem: food waste. During my summer vacation, I looked in my kitchen and saw many things we bought but never used. They were all expired!", pitch: 1.1, rate: 1.0 },
      { text: "It reminded me of a story from when I was little. I didn't know what \"expired\" meant, so I accidentally ate some old yogurt. The next day, my stomach hurt so much! I had to stay in the bathroom all day and I felt terrible. That painful experience taught me a very important lesson.", pitch: 0.85, rate: 0.85 },
      { text: "Throwing away food is not just a waste of money; it is a huge waste of resources. Did you know that Taichung is producing more food waste than we can eat? Excessive packaging and food waste are destroying our environment and even polluting our air. It is time for a change in how we eat!", pitch: 1.2, rate: 1.1 },
      { text: "We don’t need magic to save the world; we just need to change our daily habits. Small actions can create a huge impact if everyone does them. Please remember to finish your food every time you are eating. When we finish our meals, we have less waste and a much cleaner Earth. I have started a mission to make sure my plate is always empty after dinner. Taichung is our home, and this is my voice. Please join me in stopping food waste forever! Thank you!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "elsa",
    name: "Elsa",
    topic: "Air Pollution",
    title: "Air Guardian Elsa",
    loomUrl: "https://www.loom.com/share/8a408a68762d4bba9feba2fa26cdaef5",
    scripts: [
      { text: "Hello everyone! My name is **Elsa**. Every morning on my way to school, I see a lot of **cars** ▲ on the street. These vehicles pump **toxic smoke** ▲ directly into our faces while we walk. Our **lungs** ▲ are suffering because of **bad air quality** ▲. It is time to face this **serious problem** ▲ together.", pitch: 1.1, rate: 1.0 },
      { text: "During my **winter vacation** ▲, I went to the store with my family. I saw many **cars parked** ▲, but they did **not turn off their engines** ▲! **Thick, black smoke** ▲ was coming out of the back while the drivers waited. The smell was **very bad** (↑) and it made me **cough** ▲. I looked at the sky and it was **dark** and **gray** ▲. I felt **very scared** ▲ for our Earth and our health.", pitch: 0.9, rate: 0.9 },
      { text: "One day, I checked the **AQI** (↑)—the **Air Quality Index**. The report said the air was **very dangerous** ▲ for children. This happens because of **big factories** ▲ and because people **don't turn off their engines** ▲ when they stop. If we all just **turn off our cars** ▲ when we park, the air would be **much cleaner** ▲! You might think one person can't help, but **my action worked** ▲!", pitch: 1.2, rate: 1.1 },
      { text: "This experience taught me that **small actions** ▲ create a **huge impact** ▲. Now, my family takes **public transport** ▲ like the **bus** and the **MRT** ▲ to reduce **carbon emissions** ▲. We also **ride our bikes** ▲ to help the air stay **fresh** and **clean** ▲. We don’t need **magic** ▲ to save the world; we just need to **change our daily habits** ▲. Taichung is **our home** ▲, and this is **my voice** ▲. Please **join me** ▲! **Thank you** ▲!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "yunny",
    name: "Yunny",
    topic: "Stray Animals",
    title: "Animal Voice Yunny",
    loomUrl: "https://www.loom.com/share/6f06f69a183442aebf1571799e8ad51a",
    scripts: [
      { text: "Hello everyone! My name is **Yunny**. It **breaks my heart** ▲ to see poor **dogs** and **cats** ▲ living on the street with **no one to love them** ▲. They suffer from **hunger** (↑), **cold** (↑), and **diseases** ▲ every single day. We must be the **voice** ▲ for those who **cannot speak** ▲ for themselves!", pitch: 1.1, rate: 1.0 },
      { text: "During my **winter holiday** ▲, I went to my grandma’s house. I saw a **tiny gray kitten** ▲ hiding near a trash can. It was **shaking** ▲ because it was so **cold** and it looked **very hungry** ▲. I realized there are many **stray animals** ▲ in Taiwan because some people **give up** ▲ on their pets when they get **old** or **sick** ▲. This is a **very sad** and **serious problem** ▲.", pitch: 0.85, rate: 0.85 },
      { text: "I wanted to **take action** ▲! My family went to find a **park for pets** ▲. Some parks have a **\"No Pets\" sign** ▲, but we finally found a **special park** ▲ with a **playground for animals** ▲. I saw that we need **more places** ▲ where animals are **welcome** ▲. Next, my mom took me to a **pet-friendly restaurant** ▲.", pitch: 1.2, rate: 1.1 },
      { text: "When I went inside, I saw many **cute** and **happy dogs** ▲ eating with their owners. They were so **lively** (↑) and **full of joy** ▲! It made me feel **very happy** ▲ to see pets being **loved properly** ▲. This experience taught me that there is still a **lot of work** ▲ to do to help our **stray animals** ▲. Please remember to **respect all lives** ▲ and **love your pets forever** ▲. If we all **care just a little bit more** ▲, we can help every cat and dog find a **warm home** ▲. **Thank you** ▲!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "winny",
    name: "Winny",
    topic: "Eco Choices",
    title: "Smart Choice Winny",
    loomUrl: "https://www.loom.com/share/349b57966d38491d9ef5d8fb8b33ace8",
    scripts: [
      { text: "Hello everyone! My name is **Winny**. Today, I want to share my **mission** ▲ to make Taichung a **cleaner** and **healthier home** ▲. During my **winter vacation** ▲, I went to the market with my mom. I saw so many people using **small plastic bags** ▲ for every little thing. The ground was **dirty** (↑) and it smelled **very bad** ▲.", pitch: 1.1, rate: 1.0 },
      { text: "Now, I always bring **one giant reusable bag** ▲! This **small change** ▲ stops the mess and keeps our markets **clean** and **green** ▲. I also noticed something at **restaurants** ▲. Many places use **disposable plastic spoons** ▲ and **chopsticks** ▲. When plastic gets **hot** ▲ in soup, it creates **bad chemicals** ▲.", pitch: 1.2, rate: 1.1 },
      { text: "These chemicals are **invisible** ▲, but they make our **bodies sick** ▲! To **stay safe** ▲ and **protect the Earth** ▲, I always choose to use my own **reusable utensils** ▲. It is **healthier** (↑) for me and **much better** ▲ for Taichung. Lastly, I learned about **eco-friendly clothes** ▲ made from **recycled plastic** ▲. Sometimes, these clothes have a lot of **static electricity** ▲. People find them **uncomfortable** (↑) to wear and **throw them away** ▲.", pitch: 0.9, rate: 0.95 },
      { text: "That is a **waste of energy** ▲! I have a **better idea** ▲: we can use that **recycled material** ▲ to make **chairs** or **furniture** ▲ instead. We **shouldn't throw away** ▲ our hard work just because a shirt is a bit **'shocking'** (↑)! We don't need **magic** ▲ to save the world; we just need to make **smarter choices** ▲ every day. Let’s keep our city **beautiful** ▲ and our bodies **healthy** ▲ for a long time. **Thank you** ▲!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "ryan",
    name: "Ryan",
    topic: "Food Waste",
    title: "Food Saver Ryan",
    loomUrl: "https://www.loom.com/share/2e0c74f3964e40449719ab468b2f76bc",
    scripts: [
      { text: "Hello everyone! My name is **Ryan**. Have you ever **thought** ▲ about where your **food waste** ▲ goes after you **throw it away** (↑)? Today, I want to talk about a **big problem** ▲ in Taichung: **food waste** ▲.", pitch: 1.1, rate: 1.0 },
      { text: "During **Chinese New Year** ▲, I saw people eating many **delicious meals** ▲. But after dinner, there was a lot of **leftover food** ▲! Many people just **throw it away** ▲. This is a **waste of money** ▲ and a **waste of food** ▲. If we don't put leftovers in a **big fridge** ▲, they start to **smell very bad** ▲. It can smell like **someone got sick** (↑)! This creates a **dirty environment** ▲ for our beautiful city.", pitch: 0.85, rate: 0.85 },
      { text: "Did you know that Taichung produces **more food waste** ▲ than we can handle? This waste is **destroying our Earth** ▲. But we can be **\"Food Savers\"** ▲! **Don't throw away** ▲ your food. For example, if you have **leftover curry** ▲, you can make **Curry Egg Fried Rice** ▲ the next day! It is **delicious** (↑) and it **saves money** ▲. Also, remember to **buy only the food** ▲ you can **eat** ▲.", pitch: 1.2, rate: 1.1 },
      { text: "We don’t need **magic** ▲ to save the world; we just need to **change our daily habits** ▲. **Small actions** ▲ can create a **huge impact** ▲. Please **join me** ▲ and **finish your food** ▲ every day! Let’s keep Taichung **clean** ▲ together. **Thank you** ▲!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "rebecca",
    name: "Rebecca",
    topic: "Air Quality",
    title: "Air Guardian Rebecca",
    loomUrl: "https://www.loom.com/share/1135b076835543c78bf504df102cdfbf",
    scripts: [
      { text: "Close your eyes and **imagine** ▲ a city where you must **wear a mask** ▲ just to go outside and play. Sadly, this **nightmare** ▲ is starting to **happen here** ▲ in Taichung. When I see **thick smoke** ▲ coming from factories and cars, I feel **very angry** ▲. It feels like our **city is sick** ▲. **Air pollution** ▲ is **not a joke** ▲; it is destroying our **air** and our **future** ▲.", pitch: 1.1, rate: 1.0 },
      { text: "I joined the **\"Air Guardians\"** ▲ to help. My mission is called **\"The Green Traveler\"** ▲. I want to reduce **carbon dioxide** ▲ in the atmosphere. Many people leave their **car engines running** ▲ or **smoke** ▲ in public, and this makes the air **very dirty** ▲. We need to face this **serious problem** ▲ now because our **lungs** ▲ are suffering every day.", pitch: 1.2, rate: 1.1 },
      { text: "During my **Chinese New Year holiday** ▲, I decided to **take action** ▲. I chose to **ride my bike** ▲ and **walk** ▲ instead of using a car. I **recorded my data** ▲ in a log for two weeks. I successfully rode my bike **4 times** ▲ during the holiday! If I keep doing this, I can ride my bike **over 30 times** ▲ a year. This **small habit** ▲ makes a **big difference** ▲ for the planet.", pitch: 1.1, rate: 1.05 },
      { text: "We can all be **\"Green Travelers\"** ▲ together. Please, **take the bus** ▲ or the **MRT** ▲ whenever you can. If you must drive, remember to **turn off your engine** ▲ when you stop. These **small actions** ▲ help Taichung's air become **clean** and **fresh** ▲ again. We don’t need **magic** ▲ to save the world; we just need to **change our habits** ▲. Taichung is **our home** ▲. Be a **hero** ▲ for our future and our air! **Thank you** ▲!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "vincent",
    name: "Vincent",
    topic: "Stray Animals",
    title: "Animal Friend Vincent",
    scripts: [
      { text: "Hello everyone! My name is **Vincent**. Imagine a **perfect city** ▲ where every **stray animal** ▲ has a **warm bed** ▲ and a **full bowl of food** ▲. Sadly, our **reality** ▲ in Taichung is **quite different** ▲. When I look around, I see **sad dogs** ▲ and **trash** ▲ on the streets. It makes me feel **very sad** ▲ because animals are **not toys** ▲; they **feel pain** ▲ and they **feel lonely** ▲ just like us.", pitch: 1.1, rate: 1.0 },
      { text: "During **Chinese New Year** ▲, I saw many dogs **wandering** ▲ on the street. I even saw some **kind people** ▲ gave them food because they didn't want them to **starve** ▲. I learned that many dogs are **abandoned** ▲ by their owners when they become a **burden** ▲. This is a **very big problem** ▲. If you have a pet, please **never give up** ▲ on them.", pitch: 0.85, rate: 0.85 },
      { text: "I wanted to **change this** ▲, so I **actively checked** ▲ for information. I found out that Taichung has **two big animal shelters** ▲ in Nantun and Houli. I went to **see them** ▲ and took **photos** ▲ of the animals. There are many **stray dogs** ▲ there waiting for a **home** ▲. The people there **work very hard** ▲ to feed them and give them a **warm place** ▲ to stay.", pitch: 1.2, rate: 1.1 },
      { text: "I have started **giving them food** ▲ to help. By **sharing this message** ▲, I hope to **educate 100 people** ▲ this year about this issue! We **cannot look away** ▲ anymore. We must learn how to treat stray animals with **love** and **respect** ▲. A **great city** ▲ must be **kind** ▲ to everyone, including our **animal friends** ▲. I urge you to **join me** ▲ and be **kind** ▲ to our **furry neighbors** ▲. **Thank you** ▲!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "leo",
    name: "Leo",
    topic: "Plastic Pollution",
    title: "Eco Hero Leo",
    loomUrl: "https://www.loom.com/share/2643321f56be4029bb488da9e2a3f120",
    scripts: [
      { text: "Hello everyone! My name is **Leo**. Have you ever **thought** ▲ about where your **plastic bags** ▲ go after you **throw them away** (↑)? In Taichung, we have a **huge problem** ▲. Our **incinerators** ▲ are **overloaded** ▲ because we use **too much plastic** ▲ every day. It is time for us to **wake up** ▲ and see the **truth** ▲!", pitch: 1.1, rate: 1.0 },
      { text: "During my **winter vacation** ▲, I went **hiking** ▲ in the mountains. I saw something that made me **very sad** ▲. In a pile of trash, I saw a **stray dog** ▲ named **Da Huang**. He only had **three legs** ▲ and was **limping** ▲. He was **searching for food** ▲ in our garbage. It made me realize that our **waste** ▲ is **destroying the homes** ▲ of animals.", pitch: 0.85, rate: 0.85 },
      { text: "Plastic is **not just trash** ▲; it **pollutes our air** ▲ and makes our **planet hot** ▲. When the **Earth** ▲ gets **too warm** ▲, the **ice** ▲ at the poles **melts** ▲. This can release **old viruses** ▲ and make animals **die out** ▲. Humans are being **selfish** ▲, but we **share this planet** ▲ with everyone, including **Da Huang**. I decided to **change my habits** ▲ immediately.", pitch: 1.2, rate: 1.1 },
      { text: "I visited a **zero-waste store** ▲ in Taichung to see how they live. Now, I always use my own **reusable cup** ▲ when I buy drinks at the shop. **One cup** ▲ might seem small, but if we **all do it** ▲, the city will be **cleaner** ▲ and the air will be **fresh** ▲. We must **protect this planet** ▲ so we can **all survive** ▲ together. Please, **stop using plastic bags** ▲ and **bring your own cup** ▲. Let’s **save our home** ▲ before it's too late! **Thank you** ▲!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "william",
    name: "William",
    topic: "Food Waste",
    title: "Clean Plate William",
    loomUrl: "https://www.loom.com/share/e90af0e283aa45e88ee0d4989e11c761",
    scripts: [
      { text: "Hello everyone! My name is **William**. Have you ever **walked** ▲ down the street and seen someone **throw away their breakfast** ▲ because they **couldn't finish it** (↑)? It makes me feel **very sad** ▲. Today, I want to talk about why we must **stop wasting food** ▲ to **save our city** ▲.", pitch: 1.1, rate: 1.0 },
      { text: "One day, I saw a person **throw a lunch box** ▲ directly on the road. I decided to **help** ▲ instead of just watching. I **picked up the trash** ▲ and took it home to **sort it** ▲. The food inside was **old** ▲ and **smelled terrible** ▲! It made me realize that our **Earth** ▲ is getting **sick** ▲ because of all this **unnecessary waste** ▲.", pitch: 0.9, rate: 0.9 },
      { text: "When I see **food waste** ▲ and **trash** ▲ everywhere, I see a **gray sky** ▲. It looks like the **Earth has a fever** ▲ and needs **medicine** ▲. If we keep **wasting food** ▲, the planet will get **even sicker** ▲. We need to **act now** ▲ as a **team** ▲!", pitch: 1.2, rate: 1.1 },
      { text: "I have a **mission** ▲: I **always finish my food** ▲! Ever since I was a **little boy** ▲, my plate is **always clean** ▲ after a meal. Sometimes, when my **mom or dad** ▲ cannot finish their dinner, I **help them finish it** ▲! This is a **simple way** ▲ to help the Earth **every single day** ▲ of the year. Please, **don't waste food** ▲. If we all **finish our meals** ▲, the Earth will be **healthy** and **happy** ▲ again. You **don't need to be a scientist** ▲ to help; you just need to **eat your dinner** ▲. Be a **\"Clean Plate Hero\"** ▲ with me today! **Thank you** ▲!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "cynthia",
    name: "Cynthia",
    topic: "Air Quality",
    title: "Air Guardian Cynthia",
    loomUrl: "https://www.loom.com/share/d9e22f5c28354da49a191b1dddfd1d00",
    scripts: [
      { text: "Hello everyone! My name is **Cynthia**. I **love** (↑) Taichung, but I **really hate** ▲ the **dirty air** ▲. It **breaks my heart** ▲ to see our beautiful city covered in **black smoke** ▲. We are **destroying our own environment** ▲ just because it is **convenient** ▲ to drive cars everywhere. We need to **wake up** ▲!", pitch: 1.1, rate: 1.0 },
      { text: "Taichung is **\"sick\"** ▲. Every day, **factories** ▲ and **cars** ▲ pump **toxic smoke** ▲ into the sky. This smoke **destroys the protection** ▲ around our Earth. If this layer is **broken** ▲, the **sun** ▲ will shine **too brightly** ▲ and **burn our planet** ▲. We **cannot wait** ▲; we must **act now** ▲ to protect our home.", pitch: 0.9, rate: 0.9 },
      { text: "My **mission** ▲ taught me that **real change** ▲ starts with **small habits** ▲. Now, I **check the AQI** ▲ every day to see if the air is **healthy** ▲. I also use **reusable bags** ▲ and **always finish my food** ▲ to reduce waste. My family even watches **videos** ▲ to learn how to turn **\"trash into treasure\"** ▲ by **recycling** ▲!", pitch: 1.2, rate: 1.1 },
      { text: "When I grow up, I want to be an **inventor** ▲. I want to build **\"electric houses\"** ▲ and **clean cars** ▲ that do not use gas. If we use **clean energy** ▲, we can **stop the smoke** ▲ and let the **Earth breathe** ▲ again. We don’t need **magic** ▲ to save the world; we just need to **stop polluting the air** ▲. If we **change our daily habits** ▲, Taichung will become **beautiful** and **healthy** ▲ again. Please **join me** ▲! **Thank you** ▲!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "fiona",
    name: "Fiona",
    topic: "Stray Animals",
    title: "Animal Friend Fiona",
    loomUrl: "https://www.loom.com/share/dc62503cdd7541dc82e8305e35c14f3f",
    scripts: [
      { text: "Hello everyone! My name is **Fiona**. Today, I want to talk about a **serious problem** ▲ in our city: **stray animals** ▲. In Taichung, many **cats** and **dogs** ▲ live on the street with **no shelter** ▲. **Life is very hard** ▲ for them, especially when it is **cold** (↑), **rainy** (↑), and **windy** ▲.", pitch: 1.1, rate: 1.0 },
      { text: "During my **holiday** ▲, I saw a **small cat** ▲ near a restaurant. It was **injured** ▲ and looked **very sad** and **scared** ▲. My family and I gave it some **fish snacks** ▲ to help it. I realized that many animals in Taichung need a **warm home** ▲ and **someone to care for them** ▲.", pitch: 0.85, rate: 0.85 },
      { text: "Later, I saw a **different cat** ▲ at a hotel. This cat was **very chubby** ▲! The staff told me that they **feed it every day** ▲. This taught me something important: some strays have **\"community friends\"** ▲ who **look after them** ▲. This is a **beautiful way** ▲ for **neighbors to work together** ▲.", pitch: 1.2, rate: 1.1 },
      { text: "We can all **help** ▲ Taichung’s stray animals in **small ways** ▲. We can give them **clean water** ▲ or take them to a **vet** ▲ if they are hurt. But the **most important thing** ▲ is to be **responsible** ▲ with our own pets. Every **small act of kindness** ▲ helps these animals feel **less alone** ▲ in the world. A **great city** ▲ is a city that is **kind to animals** ▲. We should treat them with the **same respect** ▲ we show to people. Let’s **look after our furry neighbors** ▲ together and make Taichung a **haven for all lives** ▲. **Thank you** ▲ for listening to my story!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "zac",
    name: "Zac",
    topic: "Plastic Pollution",
    title: "River Guard Zac",
    scripts: [
      { text: "Hello everyone! My name is **Zac**. Today, I want to talk about a **small thing** ▲ that creates a **big problem** ▲ in Taichung: **plastic bags** ▲. One day, on my way home from school, I saw a **big pile of plastic bags** ▲ near a drain. I decided to **stop** ▲ and **count them** ▲.", pitch: 1.1, rate: 1.0 },
      { text: "I found **so many bags** ▲ in just one spot! It made me think: if **every person** ▲ in Taichung keeps using plastic bags **every day** ▲, our Earth will soon be **full of trash** ▲. We see them in our **parks** ▲ and on our **streets** ▲. This is a **problem** ▲ we **cannot ignore** ▲ anymore.", pitch: 0.9, rate: 0.9 },
      { text: "I did a **scientific calculation** ▲. If **30,000 people** ▲ each use **50 plastic bags** ▲, that is **1.5 million bags** ▲! That is enough to make a **whole river** ▲ in Taichung **completely polluted** ▲. When a river is **filled with plastic** ▲, the **water becomes dirty** ▲ and the **whole environment suffers** ▲. What happens to the **fish** (↑) in a polluted river?", pitch: 1.2, rate: 1.1 },
      { text: "They will die because they **cannot breathe** ▲ or **find food** ▲. Our **rivers** ▲ are a **vital part** ▲ of our home, and we must **protect the animals** ▲ that live there. If we **don't change our behavior** ▲, there will be **no more clean water** ▲ for the **future generations** ▲. So, I made a **big decision** ▲. I will use **my own reusable bag** ▲ every time I go out to shop. It is **easy to carry** ▲, and it **stops pollution** ▲! Taichung is **our home** ▲. Let’s **stop using plastic bags** ▲ and **save our rivers** ▲ together. **Thank you** ▲ for your time!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "jeremy",
    name: "Jeremy",
    topic: "Food Waste",
    title: "Food Warrior Jeremy",
    scripts: [
      { text: "Hello everyone! My name is **Jeremy**. Have you ever **thought** ▲ about where your **food goes** ▲ after you **throw it away** (↑)? During my **Chinese New Year holiday** ▲, I noticed a **big problem** ▲ in Taichung. I saw **so much food waste** ▲! Some people threw away food that was **expired** ▲, and others just **didn't finish their meals** ▲.", pitch: 1.1, rate: 1.0 },
      { text: "This made me feel **very sad** ▲ for our **resources** ▲. Did you know that Taichung is **producing more food waste** ▲ than we can eat? When we **waste food** ▲, it **destroys our environment** ▲ and even creates **bad air** ▲ for our beautiful city. We must **stop this right now** ▲!", pitch: 0.85, rate: 0.85 },
      { text: "My parents and I came up with a **great idea** ▲ to help. We made **special flyers** ▲ to teach people how to **manage their food better** ▲. I even went to the **security guards** ▲ in my neighborhood and asked them to help me **give the flyers** ▲ to my neighbors! I wanted everyone to know that **small actions** ▲ can create a **huge impact** ▲ on the world.", pitch: 1.2, rate: 1.1 },
      { text: "I also started a **personal mission** ▲. I decided to **finish every single bite** ▲ of my food, no matter what. I **take a photo** ▲ every time I finish my meal to show that I am **keeping my promise** ▲ as a warrior. We don’t need **magic** ▲ to save the world; we just need to **change our daily habits** ▲. Taichung is **our home** ▲, and this is **my voice** ▲. Please **join me** ▲ and **finish your food** ▲ to keep our city clean! **Thank you** ▲!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "emma",
    name: "Emma",
    topic: "Air Quality",
    title: "Air Guardian Emma",
    scripts: [
      { text: "Hello everyone! My name is **Emma**. Did you know that Taichung’s **temperature** ▲ is getting **hotter every year** ▲? This is happening because of **air pollution** ▲ and **global warming** ▲. Today, I want to **speak up** ▲ for our **health** ▲ and our **home** ▲.", pitch: 1.1, rate: 1.0 },
      { text: "During my **winter vacation** ▲, I realized we needed to start with our **own family's pollution** ▲. Since we have a **motorcycle** ▲, my father and I decided to **check the health condition** ▲ of our motorcycle. We found out that if the engine is **not well maintained** ▲, it could be pumping out **thick, black smoke** ▲ into the air. This made me realize that even a **single personal vehicle** ▲ can be a **big part of the problem** ▲.", pitch: 0.9, rate: 0.9 },
      { text: "If we **don't care** ▲ for our own motorcycles, we are making the air **hard for children to breathe** ▲, and our **lungs suffer** ▲ very easily. We must take this **problem seriously** ▲. One major problem is that people always **drive gas cars** ▲. But we have a **better way** ▲! We can ride **\"eco-friendly bicycles\"**. Riding a bike **doesn't make any smoke** ▲, and it even **saves money** ▲ for your family! We can also take the **bus** (↑), the **MRT** (↑), or the **train** ▲.", pitch: 1.2, rate: 1.1 },
      { text: "I learned that **clean air** ▲ is **everyone’s responsibility** ▲, not just the government's. We must **remind people** ▲: \"Turn off your engine when you are waiting!\" ▲ If we **stop making trash** ▲ and **stop the black smoke** ▲ from factories, our city will **stay beautiful** ▲. Taichung is **our home** ▲, and this is **my voice** ▲. Let's help the air **stay clean** ▲ so we can all be **healthy** and **happy** ▲. **Thank you** ▲ for listening to my speech!", pitch: 1.0, rate: 1.0 }
    ]
  },
  {
    id: "dora",
    name: "Dora",
    topic: "Stray Animals",
    title: "Animal Voice Dora",
    scripts: [
      { text: "Hello everyone! My name is **Dora**. I have a **question** ▲ for you: What would you do if you were **left alone in the rain** ▲ without an umbrella? You would feel **cold** (↑), **scared** (↑), and **very lonely** ▲. Sadly, that is the **daily reality** ▲ for thousands of **stray animals** ▲ in Taichung.", pitch: 1.1, rate: 1.0 },
      { text: "This winter, I saw a **group of stray dogs and cats** ▲. They were **very dirty** ▲ and they **smelled bad** ▲ because they had no one to wash them. I felt **so sorry** ▲ for them because they were **suffering in the cold** ▲. Later, they were taken to an **animal shelter** ▲. I was **happy** ▲ because they finally had a **warm home** ▲.", pitch: 0.85, rate: 0.85 },
      { text: "But then, a **new group of dogs** ▲ moved into the street. These dogs were **not gentle** ▲; they were **aggressive** ▲ and **scared everyone** ▲. People were **afraid to go outside** ▲, and the busy street became **empty and quiet** ▲. It showed me that when animals are **scared** ▲ and have **no homes** ▲, they can become a **danger** ▲ to the city.", pitch: 1.2, rate: 1.1 },
      { text: "Thankfully, the **animal shelter** ▲ helped again. Now, the street is **busy and happy** ▲ once more. This experience taught me an **important lesson** ▲. Animals **cannot speak our language** ▲, so we must **speak for them** ▲. We need to make sure **every animal is safe** ▲ so that our **city is safe too** ▲. Please remember: **Adopt, don't shop!** ▲ Every animal deserves a **home** ▲ and a **voice** ▲. Please **join me** ▲ to make Taichung a **kinder place** ▲ for everyone, both humans and animals. **Thank you** ▲!", pitch: 1.0, rate: 1.0 }
    ]
  }
];
