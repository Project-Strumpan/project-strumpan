-- ==============================================================================
-- Komplett Seed Data för Underkläder (Herr och Dam)
-- Inkluderar kategori-initialisering samt alla 35 unika färgprodukter (Ursprung: Spanien)
-- ==============================================================================

-- 1. Säkerställ att kategorin för Underkläder (category_id = 2) existerar
INSERT INTO Categories (category_id, parent_id, category_name, category_description)
VALUES (2, 2, 'Underwear', 'Underkläder för dam och herr')
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

-- 2. Lägg in de 35 unika färgprodukterna i Products
INSERT INTO Products (
    category_id,
    product_name,
    product_description,
    price,
    picture_url,
    origin,
    material,
    environmental_labels
) VALUES 
-- ==============================================================================
-- HERRUNDERKLÄDER (8 st)
-- ==============================================================================
(
    2,
    'Active Sport Compression Boxer Herr',
    'Svarta sportboxers med kompressionskänsla och ventilerande mikrofiber för optimal rörelsefrihet vid träning.',
    199.00,
    '/media/images/underwear/men/underwear men 1.jpg',
    'Spanien',
    '88% Återvunnen Polyamid, 12% Elastan',
    'OEKO-TEX Standard 100, GRS'
),
(
    2,
    'Classic Micro Briefs Herr - Svart',
    'Minimalistiska och bekväma briefs med låg skärning. Mjuk elastisk resår som sitter stadigt utan att skava.',
    149.00,
    '/media/images/underwear/men/underwear men 2.jpg',
    'Spanien',
    '95% Ekologisk Bomull, 5% Elastan',
    'OEKO-TEX Standard 100, GOTS'
),
(
    2,
    'Graphic Statement Slipkalsong Herr',
    'Sportig slipkalsong i fullfärg med mönstrad elastisk midjeresår och ventilerande frontpanel.',
    159.00,
    '/media/images/underwear/men/underwear men 3.jpg',
    'Spanien',
    '92% Bomull, 8% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Pure Cotton Comfort Slip Herr - Vit',
    'Stilren och mjuk vit slipkalsong i kammad premiumbomull med maximal komfort hela dagen.',
    139.00,
    '/media/images/underwear/men/underwear men 5.jpg',
    'Spanien',
    '95% Ekologisk Bomull, 5% Elastan',
    'OEKO-TEX Standard 100, GOTS'
),
(
    2,
    'Athletic Contrast Trunk Herr - Svart',
    'Mjuka svarta trunks med sportigt kontrasterande midjeband och platta sömmar som motverkar skav.',
    179.00,
    '/media/images/underwear/men/underwear men 6.jpg',
    'Spanien',
    '90% Polyamid, 10% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Everyday Stretch Trunks Herr - Grå',
    'Mjuka gråmelerade kalsonger för vardagsbruk med medellånga ben och smidig stretchpassform.',
    179.00,
    '/media/images/underwear/men/underwear men 7.jpg',
    'Spanien',
    '95% Ekologisk Bomull, 5% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Classic White Cotton Trunks Herr',
    'Tidlösa vita kalsonger med tät passform och silkeslen yta. Behåller form och färg tvätt efter tvätt.',
    179.00,
    '/media/images/underwear/men/underwear men 9.jpg',
    'Spanien',
    '95% Ekologisk Bomull, 5% Elastan',
    'OEKO-TEX Standard 100, GOTS'
),
(
    2,
    'Ribbed Pro Long Boxer Herr - Svart',
    'Långa ribbade träningsboxers med förlängda ben som förhindrar lårskav och ger lätt muskelstöd.',
    229.00,
    '/media/images/underwear/men/underwear men 10.jpg',
    'Spanien',
    '88% Återvunnen Polyester, 12% Elastan',
    'OEKO-TEX Standard 100, GRS'
),

-- ==============================================================================
-- DAMUNDERKLÄDER (27 st)
-- ==============================================================================
(
    2,
    'GARNET Sömlös Sport-BH - Svart/Orange',
    'Sömlös sport-bh med brottarrygg och pigg orange resårkant. Ger bekvämt stöd för yoga och gym.',
    299.00,
    '/media/images/underwear/women/2419-05a-GARNET-Sujetador-deportivo-naranja.jpg',
    'Spanien',
    '90% Polyamid, 10% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'SOUL Bikinitrosa Klassisk - Marinblå',
    'Klassisk bikinitrosa med medelhög midja i snabbtorkande och stretchig mikrofiber.',
    149.00,
    '/media/images/underwear/women/2427-555-SOUL-Bikini-marino.jpg',
    'Spanien',
    '82% Polyamid, 18% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'SOUL Bikinitrosa - Fuchsia',
    'Färgstark trosa i cerise/fuchsia. Mjuk mot huden med elastiska kantband som inte skär in.',
    149.00,
    '/media/images/underwear/women/2430-555-SOUL-Bikini-fucsia.jpg',
    'Spanien',
    '82% Polyamid, 18% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Active Contrast Sporttrosa Dam',
    'Sportig trosa med ventilerande meshpaneler och tvåfärgad elastisk midjelinning.',
    139.00,
    '/media/images/underwear/women/3083-6db-Pack-de-calcetines-tACcnicos-KEA.jpg',
    'Spanien',
    '90% Polyamid, 10% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'FORCE Seamless Bralette - Svart',
    'Sömlös och ovadderad mjuk-bh med justerbara axelband och djup V-ringning.',
    249.00,
    '/media/images/underwear/women/3124-4d9-Slip-masculino-FORCE.jpg',
    'Spanien',
    '90% Polyamid, 10% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'MIND Sömlös Stringtrosa - Marinblå',
    'Ultramjuk laserskuren stringtrosa utan synliga sömmar. Osynlig under träningsbyxor.',
    129.00,
    '/media/images/underwear/women/3246-474-MIND-Tanga-femenino.jpg',
    'Spanien',
    '85% Polyamid, 15% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'MIND Seamless Hipstertrosa - Svart',
    'Boxerinspirerad damtrosa med bra täckning, mjuk linning och sömlös konstruktion.',
    159.00,
    '/media/images/underwear/women/3254-698-MIND-Culotte-femenino.jpg',
    'Spanien',
    '88% Polyamid, 12% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'MIND Bikinitrosa Sömlös - Marinblå',
    'Smidig vardagstrosa med laserskurna kanter och bekväm passform över stuss och höfter.',
    149.00,
    '/media/images/underwear/women/3258-b64-MIND-Bikini-femenino.jpg',
    'Spanien',
    '85% Polyamid, 15% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'SOUL Minimalistisk Tanga - Svart',
    'Klassisk tangatrosa med smala sidopartier och bomullsfodrad gren för maximal hygien.',
    129.00,
    '/media/images/underwear/women/3293-4bb-SOUL-Tanga-femenino.jpg',
    'Spanien',
    '85% Polyamid, 15% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'SOUL Bikinitrosa - Svart',
    'Stilrent basplagg. Tidlös svart trosa med stretchig passform och silkeslen känsla.',
    139.00,
    '/media/images/underwear/women/3298-c48-SOUL-Bikini-negro.jpg',
    'Spanien',
    '85% Polyamid, 15% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Seamless Laser-Cut Briefs - Ljuslila',
    'Laserskuren trosa helt utan sömmar. Sitter som en andra hud utan att lämna märken.',
    149.00,
    '/media/images/underwear/women/482910.jpg',
    'Spanien',
    '80% Polyamid, 20% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'JADE Racerback Sport-BH - Svart',
    'Ergonomisk sömlös sport-bh med ventilerande stickad ryggzon och medium support.',
    289.00,
    '/media/images/underwear/women/JADE-Sesion-sin-titulo6324.jpg',
    'Spanien',
    '92% Polyamid, 8% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Seamless Ribbed Boy Shorts - Skiffergrå',
    'Sportiga ribbade boxertrosor med hög midja och bred resår som håller passformen perfekt.',
    169.00,
    '/media/images/underwear/women/Sesion-sin-titulo6465.jpg',
    'Spanien',
    '90% Polyamid, 10% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Ribbed Lounge Bralette & Briefs - Mocca',
    'Tvådelat ribbat underklädesset med mjuk topp och matchande trosa med hög midja.',
    329.00,
    '/media/images/underwear/women/womas underwear 1.jpg',
    'Spanien',
    '95% Modal, 5% Elastan',
    'OEKO-TEX Standard 100, Lenzing Modal'
),
(
    2,
    'Ribbed Bralette & Panty Set - Vinröd',
    'Värmande mjukt set i ribbad bomullsstretch med smala reglerbara axelband.',
    299.00,
    '/media/images/underwear/women/womas underwear  3.jpg',
    'Spanien',
    '95% Bomull, 5% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Romantic Lace Underwear Set - Röd',
    'Elegant underklädesset i mjuk spets med ovadderad bygel-bh och matchande spetstrosa.',
    349.00,
    '/media/images/underwear/women/womas underwear  4.jpg',
    'Spanien',
    '85% Polyamid, 15% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Seamless Comfort Bra & Briefs - Ljusgrå',
    'Sömlöst underklädesset med vadderingsfri topp och hög trosa i mjukaste mikrofiber.',
    279.00,
    '/media/images/underwear/women/womas underwear  5.jpg',
    'Spanien',
    '90% Polyamid, 10% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Smooth T-Shirt BH - Puderrosa',
    'Formpressad och diskret bygel-bh som ger fin form och är osynlig under tunna plagg.',
    299.00,
    '/media/images/underwear/women/womas underwear  6.jpg',
    'Spanien',
    '82% Polyamid, 18% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Nude Seamless Bralette Set - Sandbeige',
    'Ribbad topp och sömlös trosa i diskret hudnära ton. Perfekt vardagskomfort.',
    279.00,
    '/media/images/underwear/women/womas underwear  7.jpg',
    'Spanien',
    '92% Polyamid, 8% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Neon Lace Contrast Briefs - Cerise',
    'Feminin spetstrosa i stark neonrosa med sportigt kontrasterande resårband.',
    149.00,
    '/media/images/underwear/women/womas underwear  10.jpg',
    'Spanien',
    '88% Polyamid, 12% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Silky Touch Hipster Briefs - Sand',
    'Mjuk och följsam hipstertrosa med fin glans och dekorativt midjeband.',
    149.00,
    '/media/images/underwear/women/womas underwear  11.jpg',
    'Spanien',
    '90% Polyamid, 10% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Classic Logo Waistband Briefs - Vit',
    'Klassisk vit bomullstrosa med mjuk elastisk logoresår i midjan för sportig vardagskomfort.',
    139.00,
    '/media/images/underwear/women/womas underwear  12.jpg',
    'Spanien',
    '95% Bomull, 5% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Velvet & Lace Luxury Lingerie - Vinröd',
    'Exklusivt set i mjuk sammetsspets med bygel-bh och matchande strumpebandsdetaljer.',
    389.00,
    '/media/images/underwear/women/womas underwear  13.jpg',
    'Spanien',
    '85% Polyamid, 15% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Studio Seamless Crop Top & Briefs - Nude',
    'Skulpterande och bekväm sömlös topp med matchande trosa i naturlig hudton.',
    269.00,
    '/media/images/underwear/women/womas underwear  14.jpg',
    'Spanien',
    '90% Polyamid, 10% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Passion Lace Push-Up BH - Röd',
    'Romantisk spets-bh i djuprött med justerbara axelband och stödjande kupor.',
    249.00,
    '/media/images/underwear/women/womas underwear  15.jpg',
    'Spanien',
    '85% Polyamid, 15% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Delicate Lace Trim Briefs - Snövit',
    'Ren och elegant vit bomullstrosa med bred blommig spetskant i midjan.',
    149.00,
    '/media/images/underwear/women/womas underwear  17.jpg',
    'Spanien',
    '95% Ekologisk Bomull, 5% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Sheer Mesh & Lace Summer Set - Vit',
    'Lätt och transparent sommarset med ovadderad bygel-bh och skir spetstrosa.',
    319.00,
    '/media/images/underwear/women/womas underwear  19.jpg',
    'Spanien',
    '85% Polyamid, 15% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Minimal Bralette & High Cut Briefs - Svart',
    'Stilrent svart underklädesset med djup urringning och hög benskärning.',
    289.00,
    '/media/images/underwear/women/womas underwear  22.jpg',
    'Spanien',
    '90% Polyamid, 10% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Invisible Second Skin Set - Puderbeige',
    'Laserskuret och helt osynligt set med mjuk formande bh och slät trosa.',
    319.00,
    '/media/images/underwear/women/womas underwear  25.jpg',
    'Spanien',
    '80% Polyamid, 20% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Soft Comfort Backless Bralette Set - Nude',
    'Mjukt underklädesset med öppen ryggdesign och slät trosa i behaglig stretch.',
    279.00,
    '/media/images/underwear/women/womas underwear  26.jpg',
    'Spanien',
    '92% Polyamid, 8% Elastan',
    'OEKO-TEX Standard 100'
),
(
    2,
    'Polka Dot Lace Balconette Set - Svart/Rosa',
    'Lekfullt prickigt underklädesset med balconette-bh och spetsstring i rosa kontrast.',
    339.00,
    '/media/images/underwear/women/womas underwear  27.jpg',
    'Spanien',
    '85% Polyamid, 15% Elastan',
    'OEKO-TEX Standard 100'
);
