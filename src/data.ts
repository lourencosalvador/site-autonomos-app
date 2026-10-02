export type Service = {
  id: string;
  title: string;
  description: string;
  /** Valor inicial estimado. Sem valor → o card mostra "Sob orçamento". */
  price?: string;
  image: string;
  category: string;
  /** Termos extra para a pesquisa (sinónimos e palavras do dia a dia). */
  keywords?: string;
};

export const SERVICES: Service[] = [
  {
    id: 'eletricidade',
    title: 'Eletricidade',
    description: 'Instalações elétricas, quadros, tomadas, iluminação e reparação de avarias.',
    price: '12.000 Kz',
    image: '/servicos/eletricidade.jpg',
    category: 'Eletricidade',
    keywords: 'eletricista luz curto-circuito disjuntor quadro elétrico tomada interruptor lâmpada',
  },
  {
    id: 'geradores',
    title: 'Geradores',
    description: 'Instalação, manutenção e reparação de geradores a gasóleo e a gasolina.',
    image: '/servicos/geradores.jpg',
    category: 'Geradores',
    keywords: 'gerador gasóleo gasolina motor energia corte de luz',
  },
  {
    id: 'drywall-construcao-seco',
    title: 'Drywall e Construção a Seco',
    description: 'Paredes, tetos falsos e divisórias em pladur, rápidas e sem obras pesadas.',
    image: '/servicos/drywall-construcao-seco.jpg',
    category: 'Drywall e Construção a Seco',
    keywords: 'pladur gesso cartonado teto falso divisória parede',
  },
  {
    id: 'pintura-estuque',
    title: 'Pintura e Estuque',
    description: 'Pintura interior e exterior, estuque e acabamentos com qualidade profissional.',
    price: '25.000 Kz',
    image: '/servicos/pintura-estuque.jpg',
    category: 'Pintura e Estuque',
    keywords: 'pintor tinta parede massa reboco acabamento fachada',
  },
  {
    id: 'pedreira-alvenaria',
    title: 'Pedreira e Alvenaria',
    description: 'Construção e reparação de paredes, muros, reboco e pequenas obras.',
    price: '30.000 Kz',
    image: '/servicos/pedreira-alvenaria.jpg',
    category: 'Pedreira e Alvenaria',
    keywords: 'pedreiro obra construção civil muro bloco tijolo cimento reboco',
  },
  {
    id: 'ladrilho-revestimentos',
    title: 'Ladrilho e Revestimentos',
    description: 'Assentamento de mosaico, azulejo, porcelanato e revestimentos de parede.',
    image: '/servicos/ladrilho-revestimentos.jpg',
    category: 'Ladrilho e Revestimentos',
    keywords: 'ladrilhador mosaico azulejo porcelanato cerâmica pavimento piso',
  },
  {
    id: 'canalizacao',
    title: 'Canalização',
    description: 'Reparação de fugas, desentupimentos e instalação de sistemas de água.',
    price: '15.000 Kz',
    image: '/servicos/canalizacao.jpg',
    category: 'Canalização',
    keywords: 'canalizador fuga água torneira cano tubo entupimento sanita autoclismo',
  },
  {
    id: 'caixilharia-aluminio',
    title: 'Caixilharia e Alumínio',
    description: 'Janelas, portas e montras em alumínio e vidro, feitas à medida.',
    image: '/servicos/caixilharia-aluminio.jpg',
    category: 'Caixilharia e Alumínio',
    keywords: 'janela porta alumínio vidro vidraçaria montra estore caixilho',
  },
  {
    id: 'frio-climatizacao',
    title: 'Frio e Climatização (AVAC)',
    description: 'Instalação e manutenção de ar condicionado, câmaras frigoríficas e refrigeração.',
    price: '20.000 Kz',
    image: '/servicos/frio-climatizacao.jpg',
    category: 'Frio e Climatização (AVAC)',
    keywords: 'ar condicionado ac split refrigeração frio arca câmara frigorífica gás',
  },
  {
    id: 'serralharia',
    title: 'Serralharia',
    description: 'Portões, grades, estruturas metálicas e trabalhos de soldadura.',
    price: '20.000 Kz',
    image: '/servicos/serralharia.jpg',
    category: 'Serralharia',
    keywords: 'serralheiro soldadura solda ferro metal grade portão estrutura',
  },
  {
    id: 'carpintaria-moveis',
    title: 'Carpintaria e Móveis Planejados',
    description: 'Móveis por medida, roupeiros, cozinhas e reparação de estruturas em madeira.',
    price: '18.000 Kz',
    image: '/servicos/carpintaria-moveis.jpg',
    category: 'Carpintaria e Móveis Planejados',
    keywords: 'carpinteiro marceneiro marcenaria madeira móvel roupeiro armário cozinha porta montagem',
  },
  {
    id: 'seguranca-eletronica',
    title: 'Segurança Eletrónica (CCTV)',
    description: 'Câmaras de vigilância, alarmes, vídeo-porteiros e controlo de acessos.',
    price: '35.000 Kz',
    image: '/servicos/seguranca-eletronica.jpg',
    category: 'Segurança Eletrónica (CCTV)',
    keywords: 'câmara camera vigilância alarme cctv intercomunicador vídeo-porteiro segurança',
  },
  {
    id: 'piscinas',
    title: 'Piscinas',
    description: 'Limpeza, tratamento de água, manutenção e reparação de piscinas.',
    image: '/servicos/piscinas.jpg',
    category: 'Piscinas',
    keywords: 'piscina cloro bomba filtro limpeza tratamento água',
  },
  {
    id: 'placas-3d-molduras',
    title: 'Placas 3D e Molduras',
    description: 'Painéis decorativos 3D, sancas, molduras e acabamentos em gesso.',
    image: '/servicos/placas-3d-molduras.jpg',
    category: 'Placas 3D e Molduras',
    keywords: 'placa 3d painel decorativo sanca moldura gesso teto decoração',
  },
  {
    id: 'telhados-coberturas',
    title: 'Telhados e Coberturas',
    description: 'Montagem e reparação de telhados, chapas, telhas e coberturas.',
    image: '/servicos/telhados-coberturas.jpg',
    category: 'Telhados e Coberturas',
    keywords: 'telhado telha chapa zinco cobertura infiltração goteira',
  },
  {
    id: 'impermeabilizacao',
    title: 'Impermeabilização',
    description: 'Impermeabilização de lajes, terraços, casas de banho e tanques de água.',
    image: '/servicos/impermeabilizacao.jpg',
    category: 'Impermeabilização',
    keywords: 'infiltração humidade laje terraço manta tela tanque goteira',
  },
  {
    id: 'calhas-drenagem',
    title: 'Calhas e Drenagem Pluvial',
    description: 'Instalação e limpeza de caleiras, tubos de queda e drenagem de águas da chuva.',
    image: '/servicos/calhas-drenagem.jpg',
    category: 'Calhas e Drenagem Pluvial',
    keywords: 'calha caleira chuva tubo de queda drenagem pluvial escoamento',
  },
  {
    id: 'fossas-esgotos',
    title: 'Fossas Sépticas e Esgotos',
    description: 'Construção, limpeza e desentupimento de fossas e redes de esgoto.',
    image: '/servicos/fossas-esgotos.jpg',
    category: 'Fossas Sépticas e Esgotos',
    keywords: 'fossa séptica esgoto sucção desentupimento caixa de visita',
  },
  {
    id: 'energia-solar',
    title: 'Energia Solar',
    description: 'Instalação e manutenção de painéis solares, inversores e baterias.',
    image: '/servicos/energia-solar.jpg',
    category: 'Energia Solar',
    keywords: 'painel solar fotovoltaico inversor bateria energia renovável',
  },
  {
    id: 'reparacao-eletrodomesticos',
    title: 'Reparação de Eletrodomésticos',
    description: 'Arcas, geleiras, máquinas de lavar, fogões, micro-ondas e muito mais.',
    image: '/servicos/reparacao-eletrodomesticos.jpg',
    category: 'Reparação de Eletrodomésticos',
    keywords: 'geleira frigorífico arca máquina de lavar fogão micro-ondas televisão avaria',
  },
  {
    id: 'reparacao-bombas-agua',
    title: 'Reparação de Bombas de Água',
    description: 'Instalação, manutenção e reparação de bombas de água e hidropressores.',
    image: '/servicos/reparacao-bombas-agua.jpg',
    category: 'Reparação de Bombas de Água',
    keywords: 'bomba de água hidropressor motor pressão tanque cisterna',
  },
  {
    id: 'controlo-pragas',
    title: 'Controlo de Pragas',
    description: 'Desinfestação contra baratas, ratos, mosquitos, térmitas e outras pragas.',
    image: '/servicos/controlo-pragas.jpg',
    category: 'Controlo de Pragas',
    keywords: 'desinfestação fumigação baratas ratos mosquitos formigas térmitas salalé insetos',
  },
  {
    id: 'limpeza-residencial',
    title: 'Limpeza Residencial',
    description: 'Limpeza profunda de casas, apartamentos e escritórios.',
    price: '12.000 Kz',
    image: '/servicos/limpeza-residencial.jpg',
    category: 'Limpeza Residencial',
    keywords: 'limpeza casa apartamento escritório faxina lavagem pós-obra',
  },
  {
    id: 'jardinagem',
    title: 'Jardinagem',
    description: 'Manutenção de jardins, relva, podas e paisagismo.',
    price: '15.000 Kz',
    image: '/servicos/jardinagem.jpg',
    category: 'Jardinagem',
    keywords: 'jardineiro jardim relva poda plantas árvores paisagismo rega',
  },
  {
    id: 'portoes-automaticos',
    title: 'Manutenção de Portões Automáticos',
    description: 'Instalação, automatização e reparação de motores de portões.',
    image: '/servicos/portoes-automaticos.jpg',
    category: 'Manutenção de Portões Automáticos',
    keywords: 'portão automático motor comando garagem automatismo',
  },
  {
    id: 'chamines-exaustao',
    title: 'Chaminés e Exaustão',
    description: 'Instalação e limpeza de exaustores, chaminés e condutas de extração.',
    image: '/servicos/chamines-exaustao.jpg',
    category: 'Chaminés e Exaustão',
    keywords: 'chaminé exaustor extração fumos conduta cozinha',
  },
  {
    id: 'equipamentos-cozinha',
    title: 'Manutenção de Equipamentos de Cozinha',
    description: 'Fogões industriais, fornos, fritadeiras e equipamentos de restauração.',
    image: '/servicos/equipamentos-cozinha.jpg',
    category: 'Manutenção de Equipamentos de Cozinha',
    keywords: 'fogão industrial forno fritadeira cozinha industrial restaurante equipamento',
  },
];

export const CITIES = [
  'Luanda',
  'Benguela',
  'Lobito',
  'Huambo',
  'Lubango',
  'Cabinda',
  'Malanje',
  'Sumbe',
  'Namibe',
  'Uíge',
];

export type Testimonial = {
  name: string;
  role: string;
  city: string;
  text: string;
  avatar: string;
  rating: number;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Ana Domingos',
    role: 'Cliente',
    city: 'Luanda',
    text: 'Pedi um canalizador e em menos de duas horas já estava em casa a resolver o problema. Profissional e educado.',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
  {
    name: 'Carlos Mendes',
    role: 'Cliente',
    city: 'Luanda',
    text: 'Achei a plataforma muito simples. Descrevi o serviço, recebi o contacto e ficou resolvido no mesmo dia.',
    avatar: 'https://images.pexels.com/photos/220457/pexels-photo-220457.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
  {
    name: 'Joana Silva',
    role: 'Prestadora',
    city: 'Luanda',
    text: 'Desde que entrei na AUTONOMOUS, recebo novos pedidos todas as semanas. Mudou a forma como trabalho.',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
  {
    name: 'Pedro Tavares',
    role: 'Cliente',
    city: 'Luanda',
    text: 'O técnico de ar condicionado foi pontual e profissional. O preço foi exatamente o combinado, sem surpresas.',
    avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
  {
    name: 'Mara Lopes',
    role: 'Prestadora',
    city: 'Luanda',
    text: 'Gosto de poder escolher quando aceitar serviços. Tenho flexibilidade e mais renda para a minha família.',
    avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
];

export const BENEFITS = [
  { title: 'Profissionais Verificados', desc: 'Cada profissional passa por um processo de validação antes de entrar na rede.' },
  { title: 'Resposta Rápida', desc: 'Receba o contacto de um profissional qualificado em poucos minutos.' },
  { title: 'Diversas Especialidades', desc: 'Mais de 25 categorias de serviços disponíveis num só lugar.' },
  { title: 'Atendimento Seguro', desc: 'Acompanhamento em todo o processo, do pedido à conclusão do serviço.' },
  { title: 'Preços Transparentes', desc: 'Saiba o valor estimado antes de avançar. Sem surpresas.' },
  { title: 'Suporte ao Cliente', desc: 'Uma equipa pronta para ajudar sempre que precisar.' },
];
