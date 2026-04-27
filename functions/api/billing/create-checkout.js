import{json,error,readBody,getUserFromSession}from'../projects/_shared.js';const PLAN_PRICE_ENV = {
  starter: 'STRIPE_PRICE_STARTER',
  business: 'STRIPE_PRICE_BUSINESS',
  plus: 'STRIPE_PRICE_PLUS',
  custom_build_deposit: 'STRIPE_PRICE_CUSTOM_DEPOSIT'
};

const PLAN_NAMES = {
  starter: 'Starter Launch',
  business: 'Business Launch',
  plus: 'Business Plus',
  custom_build_deposit: 'Custom Built Website Deposit'
};

const ONE_TIME_PAYMENT_PLANS = new Set([
  'custom_build_deposit'
]);;function origin(request){const u=new URL(request.url);return`${u.protocol}//${u.host}`}function form(data){const p=new URLSearchParams();for(const[k,v]of Object.entries(data))p.append(k,v);return p}export async function onRequestPost({request,env}){const user=await getUserFromSession(env,request);if(!user)return error('Unauthorized.',401);const body=await readBody(request);const projectId=String(body.project_id||'').trim(),plan=String(body.plan||'business').trim(),domainOption=String(body.domain_option||'pbi_subdomain').trim(),assisted=!!body.assisted_setup;if(!projectId)return error('Missing project id.',400);if(!PLAN_PRICE_ENV[plan])return error('Invalid plan selected.',400);const project=await env.DB.prepare(`SELECT id,name,user_id FROM projects WHERE id=? AND user_id=? LIMIT 1`).bind(projectId,user.id).first();if(!project)return error('Project not found.',404);const priceId=env[PLAN_PRICE_ENV[plan]],assistedId=env.STRIPE_PRICE_ASSISTED_SETUP;if(!env.STRIPE_SECRET_KEY||!priceId){await env.DB.prepare(`UPDATE projects SET plan=?,domain_option=?,billing_status='setup_required',updated_at=datetime('now') WHERE id=? AND user_id=?`).bind(plan,domainOption,projectId,user.id).run();return json({ok:true,setup_required:true,message:`Stripe is not connected yet. Add STRIPE_SECRET_KEY and ${PLAN_PRICE_ENV[plan]} to Cloudflare environment variables to enable ${PLAN_NAMES[plan]} checkout.`})}const base=origin(request);const f={'mode':'subscription','success_url':`${base}/payment/?project=${encodeURIComponent(projectId)}&success=1`,'cancel_url':`${base}/payment/?project=${encodeURIComponent(projectId)}&cancelled=1`,'client_reference_id':projectId,'customer_email':user.email,'metadata[project_id]':projectId,'metadata[user_id]':user.id,'metadata[plan]':plan,'metadata[domain_option]':domainOption,'subscription_data[metadata][project_id]':projectId,'subscription_data[metadata][user_id]':user.id,'subscription_data[metadata][plan]':plan,'subscription_data[metadata][domain_option]':domainOption,'line_items[0][price]':priceId,'line_items[0][quantity]':'1'};if(assisted&&assistedId){f['line_items[1][price]']=assistedId;f['line_items[1][quantity]']='1'}const res=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded'},body:form(f)});const result=await res.json().catch(()=>({}));if(!res.ok)return error(result.error?.message||'Stripe checkout session could not be created.',500);await env.DB.prepare(`UPDATE projects SET plan=?,domain_option=?,billing_status='pending',stripe_session_id=?,updated_at=datetime('now') WHERE id=? AND user_id=?`).bind(plan,domainOption,result.id||'',projectId,user.id).run();return json({ok:true,url:result.url,session_id:result.id})}
