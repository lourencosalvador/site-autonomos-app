export type Service = {
  id: string;
  title: string;
  description: string;
  price: string;
  image: string;
  category: string;
};

export const SERVICES: Service[] = [
  {
    id: 'eletricidade',
    title: 'Eletricidade',
    description: 'Instalações elétricas, reparação de curtos-circuitos e manutenção.',
    price: '12.000 Kz',
    image: 'https://images.pexels.com/photos/8961066/pexels-photo-8961066.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Eletricidade',
  },
  {
    id: 'pintura',
    title: 'Pintura',
    description: 'Pintura interior e exterior com acabamento profissional.',
    price: '25.000 Kz',
    image: 'https://images.pexels.com/photos/1669754/pexels-photo-1669754.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Pintura',
  },
  {
    id: 'jardinagem',
    title: 'Jardinagem',
    description: 'Manutenção de jardins, relva e paisagismo.',
    price: '15.000 Kz',
    image: 'https://images.pexels.com/photos/1453499/pexels-photo-1453499.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Jardinagem',
  },
  {
    id: 'marcenaria',
    title: 'Marcenaria',
    description: 'Móveis sob medida e reparação de estruturas em madeira.',
    price: '18.000 Kz',
    image: 'https://images.pexels.com/photos/3637786/pexels-photo-3637786.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Marcenaria',
  },
  {
    id: 'carpintaria',
    title: 'Carpintaria',
    description: 'Construção e montagem de estruturas em madeira.',
    price: '18.000 Kz',
    image: 'https://images.pexels.com/photos/2092058/pexels-photo-2092058.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Carpintaria',
  },
  {
    id: 'serralharia',
    title: 'Serralharia',
    description: 'Trabalho em metal, portões e estruturas metálicas.',
    price: '20.000 Kz',
    image: 'https://images.pexels.com/photos/2381463/pexels-photo-2381463.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Serralharia',
  },
  {
    id: 'construcao-civil',
    title: 'Construção Civil',
    description: 'Obras, reboco, assentamento e pequenas reparações estruturais.',
    price: '30.000 Kz',
    image: 'https://images.pexels.com/photos/1216544/pexels-photo-1216544.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Construção Civil',
  },
  {
    id: 'limpeza',
    title: 'Limpeza',
    description: 'Limpeza profunda de casas, apartamentos e escritórios.',
    price: '12.000 Kz',
    image: 'https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Limpeza',
  },
  {
    id: 'informatica',
    title: 'Informática',
    description: 'Manutenção de computadores, redes e suporte técnico.',
    price: '15.000 Kz',
    image: 'https://images.pexels.com/photos/4348404/pexels-photo-4348404.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Informática',
  },
  {
    id: 'montagem-moveis',
    title: 'Montagem de Móveis',
    description: 'Montagem e desmontagem de móveis com rapidez.',
    price: '10.000 Kz',
    image: 'https://images.pexels.com/photos/4246119/pexels-photo-4246119.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Montagem de Móveis',
  },
  {
    id: 'seguranca-eletronica',
    title: 'Segurança Eletrónica',
    description: 'Câmaras, alarmes e sistemas de vigilância.',
    price: '35.000 Kz',
    image: 'https://images.pexels.com/photos/430208/pexels-photo-430208.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'Segurança Eletrónica',
  },
];

// Cidades de Angola — nomes próprios.
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
  rating: number;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Ana Domingos',
    role: 'Cliente',
    city: 'Luanda',
    text: 'Pedi um canalizador e em menos de duas horas já estava em casa a resolver o problema. Profissional e educado.',
    rating: 5,
  },
  {
    name: 'Carlos Mendes',
    role: 'Cliente',
    city: 'Luanda',
    text: 'A plataforma é muito simples. Descrevi o serviço, recebi o contacto e ficou resolvido no mesmo dia.',
    rating: 5,
  },
  {
    name: 'Joana Silva',
    role: 'Prestadora',
    city: 'Luanda',
    text: 'Desde que entrei na AUTONOMOUS, recebo novos pedidos todas as semanas. Mudou a forma como encontro trabalho.',
    rating: 5,
  },
  {
    name: 'Pedro Tavares',
    role: 'Cliente',
    city: 'Luanda',
    text: 'O técnico de ar condicionado foi pontual e profissional. O preço foi exatamente o combinado, sem surpresas.',
    rating: 5,
  },
  {
    name: 'Mara Lopes',
    role: 'Prestadora',
    city: 'Luanda',
    text: 'Gosto de poder escolher quando aceitar serviços. Tenho flexibilidade e mais renda para a minha família.',
    rating: 5,
  },
  {
    name: 'Nuno Cardoso',
    role: 'Cliente',
    city: 'Luanda',
    text: 'Finalmente uma forma de confiança para contratar profissionais qualificados. Preços transparentes e profissionais verificados.',
    rating: 5,
  },
];

export const STATS = [
  { value: 100, suffix: '+', label: 'Profissionais verificados' },
  { value: 500, suffix: '+', label: 'Clientes satisfeitos' },
  { value: 800, suffix: '+', label: 'Serviços concluídos' },
  { value: 98, suffix: '%', label: 'Satisfação dos clientes' },
];

export type Feature = { icon: string; title: string; desc: string };

export const FEATURES: Feature[] = [
  { icon: 'ShieldCheck', title: 'Profissionais verificados', desc: 'Cada profissional é validado e avaliado antes de entrar na rede.' },
  { icon: 'Clock', title: 'Resposta rápida', desc: 'Encontre um profissional qualificado em minutos, não em dias.' },
  { icon: 'Wallet', title: 'Preços transparentes', desc: 'Veja uma estimativa antes de avançar. Sem custos escondidos.' },
  { icon: 'LayoutGrid', title: 'Todos os serviços', desc: 'Várias categorias, da pintura à segurança eletrónica, num só lugar.' },
  { icon: 'MessageSquare', title: 'Comunicação direta', desc: 'Combine os detalhes diretamente com o seu profissional, num só lugar.' },
  { icon: 'Star', title: 'Avaliado por clientes', desc: 'Avaliações reais de trabalhos reais ajudam a escolher com confiança.' },
];

export type Step = { title: string; desc: string };

export const CLIENT_STEPS: Step[] = [
  { title: 'Descreva o serviço', desc: 'Diga o que precisa em poucos minutos, sem necessidade de conta.' },
  { title: 'Encontramos o profissional', desc: 'Ligamos o seu pedido a um profissional qualificado e verificado perto de si.' },
  { title: 'Serviço concluído', desc: 'O profissional resolve o problema. Avalie a experiência no final.' },
];

export const PRO_STEPS: Step[] = [
  { title: 'Crie o seu perfil', desc: 'Registe-se e partilhe a sua área, localização e experiência.' },
  { title: 'Seja aprovado', desc: 'A nossa equipa valida o seu perfil e documentos, de forma rápida e gratuita.' },
  { title: 'Receba pedidos', desc: 'Comece a receber pedidos de clientes perto de si, no seu horário.' },
];

export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: 'Como funciona a AUTONOMOUS?',
    a: 'Descreve o serviço que precisa, ligamos o seu pedido a um profissional verificado perto de si e combina os detalhes diretamente. O profissional realiza o trabalho e você avalia a experiência.',
  },
  {
    q: 'É gratuito para clientes?',
    a: 'Sim. Solicitar um serviço e ser ligado a um profissional é totalmente gratuito para clientes. Paga apenas ao profissional pelo trabalho realizado.',
  },
  {
    q: 'Como são verificados os profissionais?',
    a: 'Cada profissional passa por uma verificação de identidade e documentos antes de entrar na rede. As avaliações dos clientes mantêm a qualidade ao longo do tempo.',
  },
  {
    q: 'Em quanto tempo recebo resposta?',
    a: 'A maioria dos pedidos é ligada a um profissional qualificado em poucos minutos durante o horário de funcionamento.',
  },
  {
    q: 'Que zonas cobrem?',
    a: 'Operamos em toda Angola, com maior concentração de profissionais em Luanda e em expansão para outras províncias.',
  },
  {
    q: 'Como me torno profissional?',
    a: 'Crie um perfil, partilhe a sua área e documentos e seja aprovado pela nossa equipa. O processo é rápido e gratuito.',
  },
];
